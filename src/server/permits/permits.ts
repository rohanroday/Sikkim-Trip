/**
 * Permit requests. We never file permits: we collect the guest list and IDs
 * and hand them to the registered operator, who files on the state portal.
 */
import { randomBytes } from "crypto";
import type { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Booking, Package, Partner, PermitRequest, type BookingDoc, type PackageDoc, type PartnerDoc, type PermitRequestDoc, type PermitStatus } from "@/server/db/models";
import { addDays, istStartOfDay } from "@/lib/dates";
import { deleteObject, putObject } from "@/server/storage/storage";
import { sendTemplate } from "@/server/whatsapp/client";
import { audit } from "@/server/audit";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import type { GuestInput } from "@/server/booking/schemas";
import { statusUrl } from "@/server/booking/notify";

export const ID_RETENTION_DAYS_AFTER_TRIP = 7;
export const MAX_ID_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export function maskIdNumber(raw: string): string {
  const clean = raw.replace(/\s+/g, "");
  return clean.slice(-4);
}

export function deleteDocsAfterFor(tripEndDate: string): Date {
  return istStartOfDay(addDays(tripEndDate, ID_RETENTION_DAYS_AFTER_TRIP + 1));
}

/** Idempotent: one permit request per booking. */
export async function ensurePermitRequest(bookingId: Types.ObjectId): Promise<void> {
  await connectDB();
  const booking = await Booking.findById(bookingId).lean<BookingDoc>();
  if (!booking?.permitRequired || !booking.packageId) return;
  const pkg = await Package.findById(booking.packageId).lean<PackageDoc>();
  if (!pkg || pkg.permitType === "none") return;
  await PermitRequest.updateOne(
    { bookingId },
    {
      $setOnInsert: {
        bookingId,
        operatorId: pkg.operatorId,
        permitType: pkg.permitType,
        travelDate: booking.startDate,
        tripEndDate: booking.endDate,
        guestsExpected: booking.guests,
        guests: [],
        status: "pending_docs",
        deleteDocsAfter: deleteDocsAfterFor(booking.endDate),
      },
    },
    { upsert: true },
  );
}

/** Tourist submits every guest's details and ID file in one go. */
export async function submitGuests(args: {
  bookingId: Types.ObjectId;
  guests: GuestInput[];
  files: { body: Buffer; contentType: string }[];
  consent: boolean;
}): Promise<PermitRequestDoc> {
  await connectDB();
  if (!args.consent) throw new ValidationError("Please agree to share IDs for the permit.");
  const permit = await PermitRequest.findOne({ bookingId: args.bookingId }).lean<PermitRequestDoc>();
  if (!permit) throw new NotFoundError("This booking does not need a permit.");
  if (permit.docsPurgedAt) throw new ForbiddenError("This trip is over.");
  if (!["pending_docs", "ready"].includes(permit.status)) throw new ValidationError("IDs are already with the operator. Message us to change them.");
  if (args.guests.length !== permit.guestsExpected) throw new ValidationError(`Please add all ${permit.guestsExpected} guests.`);
  if (args.files.length !== args.guests.length) throw new ValidationError("Each guest needs one ID photo.");

  const guests = [];
  for (let i = 0; i < args.guests.length; i++) {
    const g = args.guests[i];
    const f = args.files[i];
    if (!ALLOWED_TYPES.has(f.contentType)) throw new ValidationError("ID files must be JPG, PNG, WEBP or PDF.");
    if (f.body.length > MAX_ID_FILE_BYTES) throw new ValidationError("Each ID file must be under 4 MB.");
    const ext = f.contentType === "application/pdf" ? "pdf" : f.contentType.split("/")[1];
    const key = `guest-ids/${args.bookingId}/${randomBytes(8).toString("hex")}.${ext}`;
    await putObject(key, f.body, f.contentType);
    guests.push({
      name: g.name,
      age: g.age,
      gender: g.gender,
      nationality: g.nationality,
      isForeign: g.nationality.trim().toLowerCase() !== "indian",
      idType: g.idType,
      idNumberMasked: maskIdNumber(g.idNumber),
      idFileKey: key,
    });
  }

  // Replace any earlier upload and remove the old files.
  for (const old of permit.guests ?? []) if (old.idFileKey) await deleteObject(old.idFileKey).catch(() => {});
  const updated = await PermitRequest.findOneAndUpdate(
    { _id: permit._id },
    { $set: { guests, consentAt: new Date(), status: "ready" } },
    { new: true },
  ).lean<PermitRequestDoc>();
  await audit({ actor: "tourist", action: "permit.docs_submitted", entity: "permit_request", entityId: String(permit._id), after: { guests: guests.length } });
  return updated!;
}

/** Admin hands the ready guest list to the operator over WhatsApp. */
export async function sendPermitToOperator(permitId: string, actor: string): Promise<void> {
  await connectDB();
  const permit = await PermitRequest.findById(permitId).lean<PermitRequestDoc>();
  if (!permit) throw new NotFoundError();
  if (permit.status !== "ready") throw new ValidationError("Guest list is not complete yet.");
  const [booking, operator] = await Promise.all([
    Booking.findById(permit.bookingId).lean<BookingDoc>(),
    Partner.findById(permit.operatorId).lean<PartnerDoc>(),
  ]);
  if (!booking || !operator) throw new NotFoundError();
  await sendTemplate({
    to: operator.whatsapp,
    template: "permit_request",
    bodyParams: [booking.code, permit.permitType, permit.travelDate, String(permit.guests?.length ?? 0)],
    bookingId: booking._id,
  });
  await PermitRequest.updateOne({ _id: permit._id }, { status: "sent" });
  await audit({ actor, action: "permit.sent", entity: "permit_request", entityId: permitId });
}

const PERMIT_STATUS_COPY: Partial<Record<PermitStatus, string>> = {
  filed: "filed with the state. We will tell you when it is approved",
  approved: "approved. Carry the same ID you uploaded",
  rejected: "not approved. We will call you about next steps",
};

export async function setPermitStatus(permitId: string, status: "filed" | "approved" | "rejected", note: string, actor: string) {
  await connectDB();
  const permit = await PermitRequest.findByIdAndUpdate(permitId, { status, statusNote: note }, { new: true }).lean<PermitRequestDoc>();
  if (!permit) throw new NotFoundError();
  const booking = await Booking.findById(permit.bookingId).select("+accessToken").lean<BookingDoc & { accessToken: string }>();
  if (booking) {
    await sendTemplate({
      to: booking.tourist.phone,
      template: "permit_status",
      bodyParams: [booking.tourist.name, permit.permitType, booking.code, PERMIT_STATUS_COPY[status] ?? status, statusUrl(booking.code, booking.accessToken)],
      bookingId: booking._id,
    });
  }
  await audit({ actor, action: `permit.${status}`, entity: "permit_request", entityId: permitId, after: { note } });
}

/** Delete guest ID files once the retention window has passed. */
export async function purgeExpiredGuestDocs(now: Date = new Date()): Promise<number> {
  await connectDB();
  const due = await PermitRequest.find({ deleteDocsAfter: { $lte: now }, docsPurgedAt: null }).limit(200).lean<PermitRequestDoc[]>();
  for (const p of due) {
    for (const g of p.guests ?? []) if (g.idFileKey) await deleteObject(g.idFileKey);
    await PermitRequest.updateOne(
      { _id: p._id },
      { $set: { docsPurgedAt: now, "guests.$[].idFileKey": null } },
    );
    await audit({ actor: "system:purge", action: "permit.docs_purged", entity: "permit_request", entityId: String(p._id), after: { files: p.guests?.length ?? 0 } });
  }
  return due.length;
}

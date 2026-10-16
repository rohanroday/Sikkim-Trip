import { Types } from "mongoose";
import { connectDB, withTransaction } from "@/lib/db/connect";
import { Booking, Partner, type BookingDoc, type PartnerDoc } from "@/lib/db/models";
import { transitionBooking } from "@/lib/booking/stateMachine";
import { notifyAdmin, notifyBookingConfirmed } from "@/lib/booking/notify";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { diffDays, todayIST } from "@/lib/dates";

export type PartnerResponse = "confirm" | "decline";

export function parseButtonPayload(payload: string): { response: PartnerResponse; bookingId: string; partnerId: string } | null {
  const m = /^(confirm|decline):([a-f0-9]{24}):([a-f0-9]{24})$/i.exec(payload);
  if (!m) return null;
  return { response: m[1].toLowerCase() as PartnerResponse, bookingId: m[2], partnerId: m[3] };
}

/**
 * Record a partner's confirm/decline. When `fromPhone` is given (WhatsApp),
 * it must match the partner's number on file.
 */
export async function recordPartnerResponse(args: {
  bookingId: string;
  partnerId: string;
  response: PartnerResponse;
  fromPhone?: string;
  actor: string;
}): Promise<"confirmed_all" | "recorded" | "declined" | "ignored"> {
  await connectDB();
  const partner = await Partner.findById(args.partnerId).lean<PartnerDoc>();
  if (!partner) throw new NotFoundError("Partner not found.");
  if (args.fromPhone && args.fromPhone !== partner.whatsapp) throw new ForbiddenError("This number is not the partner on the booking.");

  const booking = await Booking.findById(args.bookingId).lean<BookingDoc>();
  if (!booking) throw new NotFoundError("Booking not found.");
  const entry = booking.partnerConfirmations?.find((c) => String(c.partnerId) === args.partnerId);
  if (!entry) throw new ValidationError("Partner is not on this booking.");
  if (booking.status !== "paid" || entry.status !== "pending") return "ignored";

  const newStatus = args.response === "confirm" ? "confirmed" : "declined";
  const res = await Booking.updateOne(
    { _id: booking._id, status: "paid", partnerConfirmations: { $elemMatch: { partnerId: new Types.ObjectId(args.partnerId), status: "pending" } } },
    { $set: { "partnerConfirmations.$.status": newStatus, "partnerConfirmations.$.respondedAt": new Date() } },
  );
  if (res.modifiedCount === 0) return "ignored";
  await audit({ actor: args.actor, action: `partner.${newStatus}`, entity: "booking", entityId: args.bookingId, after: { partnerId: args.partnerId } });

  if (newStatus === "declined") {
    await notifyAdmin(booking.code, `${partner.name} declined. Find an equal or better replacement within 2 hours, or refund in full.`, booking._id);
    return "declined";
  }

  // Move to confirmed once everyone has confirmed. Guarded so concurrent confirms are safe.
  let confirmedAll = false;
  await withTransaction(async (session) => {
    const fresh = await Booking.findById(booking._id, null, { session }).lean<BookingDoc>();
    if (fresh?.status === "paid" && fresh.partnerConfirmations?.every((c) => c.status === "confirmed")) {
      await transitionBooking(booking._id, "confirmed", { actor: args.actor, session, note: "all partners confirmed" });
      confirmedAll = true;
    }
  });
  if (confirmedAll) {
    await notifyBookingConfirmed(booking._id);
    return "confirmed_all";
  }
  return "recorded";
}

/** Response window: 2 hours, or 30 minutes when the trip starts within 7 days. */
export function slaMinutes(startDate: string, now: Date = new Date()): number {
  return diffDays(todayIST(now), startDate) <= 7 ? 30 : 120;
}

/** Escalate pending partner confirmations that missed their window. */
export async function escalateLateConfirmations(now: Date = new Date()): Promise<number> {
  await connectDB();
  const pending = await Booking.find({
    status: "paid",
    partnerConfirmations: { $elemMatch: { status: "pending", escalatedAt: null, notifiedAt: { $ne: null } } },
  }).lean<BookingDoc[]>();
  let count = 0;
  for (const b of pending) {
    const limit = slaMinutes(b.startDate, now) * 60_000;
    for (const c of b.partnerConfirmations ?? []) {
      if (c.status !== "pending" || c.escalatedAt || !c.notifiedAt) continue;
      if (now.getTime() - new Date(c.notifiedAt).getTime() < limit) continue;
      const partner = await Partner.findById(c.partnerId).lean<PartnerDoc>();
      await notifyAdmin(b.code, `${partner?.name ?? "A partner"} has not confirmed in time. Please call them.`, b._id);
      await Booking.updateOne(
        { _id: b._id },
        { $set: { "partnerConfirmations.$[c].escalatedAt": now } },
        { arrayFilters: [{ "c.partnerId": c.partnerId }] },
      );
      count++;
    }
  }
  return count;
}

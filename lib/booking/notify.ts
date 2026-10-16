import type { Types } from "mongoose";
import { Booking, Partner, type BookingDoc, type PartnerDoc } from "@/lib/db/models";
import { sendTemplate } from "@/lib/whatsapp/client";
import { env } from "@/lib/env";
import { formatINR } from "@/lib/money";
import { addDays, formatNight } from "@/lib/dates";

export function statusUrl(code: string, accessToken: string): string {
  return `${env.siteUrl}/booking/${encodeURIComponent(code)}?t=${encodeURIComponent(accessToken)}`;
}

export function tripLabel(b: Pick<BookingDoc, "items">): string {
  return b.items?.[0]?.label ?? "your trip";
}

export function dateRangeLabel(b: Pick<BookingDoc, "startDate" | "endDate" | "kind">): string {
  return b.kind === "stay"
    ? `${formatNight(b.startDate)} to ${formatNight(b.endDate)}`
    : formatNight(b.startDate);
}

async function loadWithToken(bookingId: Types.ObjectId) {
  return Booking.findById(bookingId).select("+accessToken").lean<BookingDoc & { accessToken: string }>();
}

export async function notifyAdmin(code: string, text: string, bookingId?: Types.ObjectId) {
  const to = env.adminAlertWhatsapp;
  if (!to) {
    console.warn(`[escalation] ${code}: ${text}`);
    return;
  }
  await sendTemplate({ to, template: "escalation", bodyParams: [code, text], bookingId });
}

/** After payment: tell the tourist, ask every partner to confirm, ask for permit IDs. */
export async function notifyBookingPaid(bookingId: Types.ObjectId): Promise<void> {
  const b = await loadWithToken(bookingId);
  if (!b) return;
  const link = statusUrl(b.code, b.accessToken);

  await sendTemplate({
    to: b.tourist.phone,
    template: "booking_received",
    bodyParams: [b.tourist.name, formatINR(b.amount), tripLabel(b), dateRangeLabel(b), b.code, link],
    bookingId: b._id,
  });

  const partnerIds = (b.partnerConfirmations ?? []).map((c) => c.partnerId);
  const partners = await Partner.find({ _id: { $in: partnerIds } }).lean<PartnerDoc[]>();
  for (const p of partners) {
    const mine = (b.items ?? []).filter((i) => String(i.partnerId) === String(p._id));
    const payout = mine.reduce((s, i) => s + i.amount - i.commission, 0);
    const what = mine.map((i) => i.label).join(" + ");
    const when = mine[0]?.nights?.length
      ? `${formatNight(mine[0].nights[0])}, ${mine[0].nights.length} night${mine[0].nights.length > 1 ? "s" : ""}`
      : formatNight(b.startDate);
    await sendTemplate({
      to: p.whatsapp,
      template: "booking_request",
      bodyParams: [b.code, what, String(b.guests), when, formatINR(payout)],
      quickReplies: [`confirm:${b._id}:${p._id}`, `decline:${b._id}:${p._id}`],
      bookingId: b._id,
    });
  }
  await Booking.updateOne(
    { _id: b._id },
    { $set: { "partnerConfirmations.$[c].notifiedAt": new Date() } },
    { arrayFilters: [{ "c.status": "pending" }] },
  );

  if (b.permitRequired) {
    await sendTemplate({
      to: b.tourist.phone,
      template: "documents_needed",
      bodyParams: [b.tourist.name, b.code, String(b.guests), formatNight(addDays(b.startDate, -3)), link],
      bookingId: b._id,
    });
  }
}

export async function notifyBookingConfirmed(bookingId: Types.ObjectId): Promise<void> {
  const b = await loadWithToken(bookingId);
  if (!b) return;
  await sendTemplate({
    to: b.tourist.phone,
    template: "booking_confirmed",
    bodyParams: [b.tourist.name, b.code, formatNight(b.startDate), statusUrl(b.code, b.accessToken)],
    bookingId: b._id,
  });
}

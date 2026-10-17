import { connectDB, withTransaction } from "@/server/db/connect";
import { Booking, type BookingDoc, type BookingStatus } from "@/server/db/models";
import { transitionBooking } from "@/server/booking/stateMachine";
import { releaseBookingInventory } from "@/server/booking/expire";
import { createRefund, isRazorpayConfigured } from "@/server/payments/razorpay";
import { sendTemplate } from "@/server/whatsapp/client";
import { notifyAdmin } from "@/server/booking/notify";
import { diffDays, todayIST } from "@/lib/dates";
import { formatINR, type Paise } from "@/lib/money";
import { NotFoundError, ValidationError } from "@/lib/errors";

/**
 * Cancellation tiers. PROPOSAL from PRD §14 Q2, not final: ask Rohan before changing.
 * Days are counted from today (IST) to the trip start date.
 */
export const CANCELLATION_TIERS = [
  { minDays: 16, refundPct: 90, label: "More than 15 days before the trip" },
  { minDays: 7, refundPct: 50, label: "7 to 15 days before the trip" },
  { minDays: -Infinity, refundPct: 0, label: "Less than 7 days before the trip" },
] as const;

export function refundPctFor(startDate: string, today: string): number {
  const days = diffDays(today, startDate);
  return CANCELLATION_TIERS.find((t) => days >= t.minDays)!.refundPct;
}

export function refundAmount(amount: Paise, pct: number): Paise {
  return Math.floor((amount * pct) / 100);
}

const CANCELLABLE: BookingStatus[] = ["paid", "confirmed"];

export function cancellationQuote(b: Pick<BookingDoc, "status" | "amount" | "startDate">, now = new Date(), forceFull = false) {
  if (!CANCELLABLE.includes(b.status as BookingStatus)) return null;
  const pct = forceFull ? 100 : refundPctFor(b.startDate, todayIST(now));
  return { refundPct: pct, refund: refundAmount(b.amount, pct) };
}

/**
 * Cancel a paid or confirmed booking: release inventory, refund per policy.
 * forceFull is for route closures and partner failures (admin only).
 */
export async function cancelBooking(args: {
  bookingId: string;
  actor: string;
  reason: string;
  forceFull?: boolean;
  now?: Date;
}): Promise<{ refund: Paise; refundPct: number }> {
  await connectDB();
  const booking = await Booking.findById(args.bookingId).lean<BookingDoc>();
  if (!booking) throw new NotFoundError("Booking not found.");
  const quote = cancellationQuote(booking, args.now, args.forceFull);
  if (!quote) throw new ValidationError("This booking can no longer be cancelled online.");

  await withTransaction(async (session) => {
    await releaseBookingInventory(booking, session);
    await transitionBooking(booking._id, "cancelled", {
      actor: args.actor,
      session,
      note: args.reason,
      set: { cancellation: { requestedAt: new Date(), by: args.actor, reason: args.reason, refundPct: quote.refundPct } },
    });
  });

  if (quote.refund > 0 && booking.razorpayPaymentId) {
    if (isRazorpayConfigured()) {
      try {
        const r = await createRefund({ paymentId: booking.razorpayPaymentId, amount: quote.refund, notes: { code: booking.code } });
        // Moves to refunded when the refund.processed webhook arrives.
        await Booking.updateOne({ _id: booking._id }, { refund: { amount: quote.refund, razorpayRefundId: r.id, status: "pending", reason: args.reason } });
      } catch (err) {
        await Booking.updateOne({ _id: booking._id }, { refund: { amount: quote.refund, status: "failed", reason: args.reason } });
        await notifyAdmin(booking.code, `Refund failed: ${err instanceof Error ? err.message : err}`, booking._id);
      }
    } else {
      await transitionBooking(booking._id, "refunded", {
        actor: "system:dev-refund",
        set: { refund: { amount: quote.refund, status: "simulated", reason: args.reason } },
      });
    }
  }

  await sendTemplate({
    to: booking.tourist.phone,
    template: "booking_cancelled",
    bodyParams: [booking.code, quote.refund > 0 ? formatINR(quote.refund) : "none under the cancellation policy"],
    bookingId: booking._id,
  });
  return quote;
}

/** refund.processed webhook. */
export async function handleRefundProcessed(refundId: string): Promise<void> {
  await connectDB();
  const booking = await Booking.findOne({ "refund.razorpayRefundId": refundId }).lean<BookingDoc>();
  if (!booking || booking.status !== "cancelled") return;
  await transitionBooking(booking._id, "refunded", { actor: "razorpay:webhook", set: { "refund.status": "processed" } });
  await sendTemplate({
    to: booking.tourist.phone,
    template: "refund_processed",
    bodyParams: [formatINR(booking.refund?.amount ?? 0), booking.code],
    bookingId: booking._id,
  });
}

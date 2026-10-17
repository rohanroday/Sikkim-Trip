import type { Types } from "mongoose";
import { connectDB, withTransaction } from "@/server/db/connect";
import { Booking, type BookingDoc } from "@/server/db/models";
import { bookRoomNightsDirect, confirmHeldNights, holdSeats } from "@/server/inventory/holds";
import { transitionBooking } from "@/server/booking/stateMachine";
import { HoldConflictError } from "@/lib/errors";
import { createRefund, isRazorpayConfigured } from "@/server/payments/razorpay";
import { notifyAdmin, notifyBookingPaid } from "@/server/booking/notify";
import { ensurePermitRequest } from "@/server/permits/permits";
import { audit } from "@/server/audit";

export type PaymentOutcome = "paid" | "already_handled" | "refunded_unavailable" | "amount_mismatch" | "not_found";

function confirmationsFor(b: Pick<BookingDoc, "items">) {
  const ids = [...new Set((b.items ?? []).map((i) => String(i.partnerId)))];
  return ids.map((id) => ({ partnerId: id, status: "pending" }));
}

/**
 * Handle a captured payment. Driven by the Razorpay webhook (never the browser
 * redirect). Idempotent: calling it twice for the same payment is a no-op.
 */
export async function handlePaymentCaptured(args: {
  orderId: string;
  paymentId: string;
  amount: number;
  actor?: string;
}): Promise<PaymentOutcome> {
  await connectDB();
  const actor = args.actor ?? "razorpay:webhook";
  const booking = await Booking.findOne({ razorpayOrderId: args.orderId }).lean<BookingDoc>();
  if (!booking) return "not_found";
  if (booking.razorpayPaymentId === args.paymentId && booking.status !== "held" && booking.status !== "expired") {
    return "already_handled";
  }
  if (["paid", "confirmed", "completed", "cancelled", "refunded"].includes(booking.status)) return "already_handled";

  if (args.amount !== booking.amount) {
    await Booking.updateOne({ _id: booking._id }, { flagged: `amount mismatch: paid ${args.amount}, expected ${booking.amount}` });
    await audit({ actor, action: "payment.amount_mismatch", entity: "booking", entityId: String(booking._id), after: args });
    await notifyAdmin(booking.code, "Payment amount does not match the booking. Check before confirming.", booking._id);
    return "amount_mismatch";
  }

  const paidFields = { razorpayPaymentId: args.paymentId, paidAt: new Date(), partnerConfirmations: confirmationsFor(booking) };

  if (booking.status === "held") {
    await withTransaction(async (session) => {
      await confirmHeldNights(booking._id, session);
      await transitionBooking(booking._id, "paid", { actor, session, set: paidFields, unset: ["holdExpiresAt"] });
    });
  } else {
    // Late payment after the hold expired: rebook if every night and seat is still free.
    try {
      await withTransaction(async (session) => {
        for (const item of booking.items ?? []) {
          if (item.type === "package" && item.packageId && item.departureDate && item.seats) {
            await holdSeats({ packageId: item.packageId, date: item.departureDate, seats: item.seats }, session);
          }
          if (item.roomId && item.nights?.length) {
            await bookRoomNightsDirect({ roomId: item.roomId, nights: item.nights, bookingId: booking._id }, session);
          }
        }
        await transitionBooking(booking._id, "paid", { actor, session, set: paidFields, note: "late payment, rebooked" });
      });
    } catch (err) {
      if (!(err instanceof HoldConflictError)) throw err;
      await refundUnavailable(booking._id, booking.code, args.paymentId, booking.amount, actor);
      return "refunded_unavailable";
    }
  }

  if (booking.permitRequired) await ensurePermitRequest(booking._id);
  await notifyBookingPaid(booking._id);
  return "paid";
}

async function refundUnavailable(bookingId: Types.ObjectId, code: string, paymentId: string, amount: number, actor: string) {
  let refund: { razorpayRefundId?: string; status: "pending" | "simulated" } = { status: "simulated" };
  if (isRazorpayConfigured()) {
    try {
      const r = await createRefund({ paymentId, amount, notes: { reason: "dates no longer available", code } });
      refund = { razorpayRefundId: r.id, status: "pending" };
    } catch (err) {
      // Leave the booking expired and flagged so a human finishes the refund.
      await Booking.updateOne({ _id: bookingId }, { razorpayPaymentId: paymentId, flagged: "late payment, auto-refund failed" });
      await notifyAdmin(code, `Auto-refund failed after late payment: ${err instanceof Error ? err.message : err}`, bookingId);
      return;
    }
  }
  await transitionBooking(bookingId, "refunded", {
    actor,
    note: "late payment, dates gone, auto-refund",
    set: { razorpayPaymentId: paymentId, refund: { amount, reason: "dates no longer available", ...refund } },
  });
  await notifyAdmin(code, "Late payment arrived after the hold expired and the dates were taken. Full refund started.", bookingId);
}

import { withTransaction } from "@/server/db/connect";
import { Booking, type BookingDoc } from "@/server/db/models";
import { createOrder, devPaymentsAllowed, isRazorpayConfigured } from "@/server/payments/razorpay";
import { releaseBookingInventory } from "@/server/booking/expire";
import { transitionBooking } from "@/server/booking/stateMachine";
import { ConfigError } from "@/lib/errors";

/**
 * Create the Razorpay order for a fresh hold, server-side, from the booking's
 * own amount. If the order cannot be created, the hold is released at once.
 */
export async function attachPaymentOrder(booking: BookingDoc): Promise<{ orderId: string | null; devPay: boolean }> {
  if (!isRazorpayConfigured()) {
    if (devPaymentsAllowed()) return { orderId: null, devPay: true };
    throw new ConfigError("Payments are not configured.");
  }
  try {
    const order = await createOrder({
      amount: booking.amount,
      receipt: booking.code,
      notes: { bookingId: String(booking._id), code: booking.code },
    });
    await Booking.updateOne({ _id: booking._id }, { razorpayOrderId: order.id });
    return { orderId: order.id, devPay: false };
  } catch (err) {
    await withTransaction(async (session) => {
      await releaseBookingInventory(booking, session);
      await transitionBooking(booking._id, "expired", { actor: "system:order-failed", session, note: "payment order failed" });
    });
    throw err;
  }
}

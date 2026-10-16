import { NextResponse } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/http";
import { devPaymentsAllowed } from "@/lib/payments/razorpay";
import { bookingForToken } from "@/lib/booking/access";
import { Booking } from "@/lib/db/models";
import { handlePaymentCaptured } from "@/lib/booking/payment";

/**
 * Local development only, when no Razorpay keys are set: runs the same code
 * path as the payment.captured webhook. Returns 404 everywhere else.
 */
export async function POST(req: Request) {
  if (!devPaymentsAllowed()) return NextResponse.json({ error: "not found" }, { status: 404 });
  return handle(async () => {
    const { code, token } = z.object({ code: z.string(), token: z.string() }).parse(await req.json());
    const booking = await bookingForToken(code, token);
    const orderId = booking.razorpayOrderId ?? `dev_order_${booking.code}`;
    if (!booking.razorpayOrderId) await Booking.updateOne({ _id: booking._id }, { razorpayOrderId: orderId });
    const outcome = await handlePaymentCaptured({ orderId, paymentId: `dev_pay_${booking.code}`, amount: booking.amount, actor: "dev:simulated" });
    return { outcome };
  });
}

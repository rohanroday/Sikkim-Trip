import { handle } from "@/server/http";
import { requireSession } from "@/server/auth/session";
import { createHoldSchema } from "@/server/booking/schemas";
import { createHold } from "@/server/booking/createHold";
import { attachPaymentOrder } from "@/server/booking/order";

/** T-06/T-07: create a 10-minute hold and a Razorpay order for it. */
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const input = createHoldSchema.parse(await req.json());
    const { booking, accessToken } = await createHold(input, session.phone);
    const order = await attachPaymentOrder(booking);
    return {
      code: booking.code,
      token: accessToken,
      amount: booking.amount,
      orderId: order.orderId,
      devPay: order.devPay,
      holdExpiresAt: booking.holdExpiresAt,
    };
  });
}

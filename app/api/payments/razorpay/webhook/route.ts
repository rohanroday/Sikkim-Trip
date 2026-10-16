import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { WebhookEvent } from "@/lib/db/models";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { handlePaymentCaptured } from "@/lib/booking/payment";
import { handleRefundProcessed } from "@/lib/booking/cancel";

type RazorpayEvent = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; amount: number; status: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
  };
};

export async function POST(req: Request) {
  // Signature is checked on the raw body before anything is parsed.
  const raw = await req.text();
  const ok = verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"), process.env.RAZORPAY_WEBHOOK_SECRET ?? "");
  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 400 });

  const event = JSON.parse(raw) as RazorpayEvent;
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${event.event}:${event.payload.payment?.entity.id ?? event.payload.refund?.entity.id}`;

  await connectDB();
  try {
    await WebhookEvent.create({ provider: "razorpay", eventId, type: event.event });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return NextResponse.json({ ok: true, duplicate: true });
    throw err;
  }

  try {
    if (event.event === "payment.captured" && event.payload.payment) {
      const p = event.payload.payment.entity;
      const outcome = await handlePaymentCaptured({ orderId: p.order_id, paymentId: p.id, amount: p.amount });
      return NextResponse.json({ ok: true, outcome });
    }
    if (event.event === "refund.processed" && event.payload.refund) {
      await handleRefundProcessed(event.payload.refund.entity.id);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Let Razorpay retry: forget the event so the retry is processed.
    await WebhookEvent.deleteOne({ provider: "razorpay", eventId });
    console.error("razorpay webhook failed", err);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}

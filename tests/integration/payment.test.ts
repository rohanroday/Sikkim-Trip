import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { createHmac } from "crypto";
import { Booking, Inventory, PermitRequest, Message } from "@/server/db/models";
import { createHold } from "@/server/booking/createHold";
import { releaseExpiredHolds } from "@/server/booking/expire";
import { handlePaymentCaptured } from "@/server/booking/payment";
import { recordPartnerResponse } from "@/server/booking/confirmations";
import { cancelBooking, refundPctFor } from "@/server/booking/cancel";
import { verifyWebhookSignature } from "@/server/payments/razorpay";
import { inDays, makePackage, makeStay, resetDb, setupDb, TOURIST, TOURIST_PHONE } from "../helpers";

beforeAll(setupDb);
beforeEach(resetDb);
afterAll(() => mongoose.disconnect());

async function heldStay(nights?: string[]) {
  const stay = await makeStay({ nights: nights ?? [inDays(20)] });
  const { booking } = await createHold(
    { kind: "stay", propertySlug: stay.property.slug, roomId: String(stay.rooms[0]._id), checkIn: inDays(20), checkOut: inDays(21), guests: 2, tourist: TOURIST },
    TOURIST_PHONE,
  );
  await Booking.updateOne({ _id: booking._id }, { razorpayOrderId: "order_" + booking.code });
  return { stay, booking: { ...booking, razorpayOrderId: "order_" + booking.code } };
}

describe("payment captured", () => {
  it("marks paid, books the nights and asks partners to confirm", async () => {
    const { booking } = await heldStay();
    const out = await handlePaymentCaptured({ orderId: booking.razorpayOrderId, paymentId: "pay_1", amount: booking.amount });
    expect(out).toBe("paid");
    const b = (await Booking.findById(booking._id).lean())!;
    expect(b.status).toBe("paid");
    expect(b.partnerConfirmations).toHaveLength(1);
    expect(await Inventory.countDocuments({ status: "booked" })).toBe(1);
    expect(await Message.countDocuments({ template: "booking_request" })).toBe(1);
  });

  it("is idempotent for duplicate webhooks", async () => {
    const { booking } = await heldStay();
    const args = { orderId: booking.razorpayOrderId, paymentId: "pay_1", amount: booking.amount };
    await handlePaymentCaptured(args);
    expect(await handlePaymentCaptured(args)).toBe("already_handled");
    expect(await Message.countDocuments({ template: "booking_received" })).toBe(1);
  });

  it("flags an amount mismatch instead of confirming", async () => {
    const { booking } = await heldStay();
    expect(await handlePaymentCaptured({ orderId: booking.razorpayOrderId, paymentId: "pay_1", amount: 1 })).toBe("amount_mismatch");
    expect((await Booking.findById(booking._id).lean())!.status).toBe("held");
  });

  it("rebooks a late payment when the nights are still free", async () => {
    const { booking } = await heldStay();
    await releaseExpiredHolds(new Date(Date.now() + 11 * 60_000));
    const out = await handlePaymentCaptured({ orderId: booking.razorpayOrderId, paymentId: "pay_1", amount: booking.amount });
    expect(out).toBe("paid");
    expect(await Inventory.countDocuments({ status: "booked", bookingId: booking._id })).toBe(1);
  });

  it("refunds a late payment when the nights were taken", async () => {
    const { stay, booking } = await heldStay();
    await releaseExpiredHolds(new Date(Date.now() + 11 * 60_000));
    await createHold(
      { kind: "stay", propertySlug: stay.property.slug, roomId: String(stay.rooms[0]._id), checkIn: inDays(20), checkOut: inDays(21), guests: 1, tourist: TOURIST },
      "+919822222222",
    );
    const out = await handlePaymentCaptured({ orderId: booking.razorpayOrderId, paymentId: "pay_1", amount: booking.amount });
    expect(out).toBe("refunded_unavailable");
    const b = (await Booking.findById(booking._id).lean())!;
    expect(b.status).toBe("refunded");
    expect(b.refund?.amount).toBe(booking.amount);
  });

  it("creates a permit request for permit trips", async () => {
    const stay = await makeStay();
    const { pkg, date } = await makePackage(stay);
    const { booking } = await createHold({ kind: "package", packageSlug: pkg.slug, date, guests: 2, tourist: TOURIST }, TOURIST_PHONE);
    await Booking.updateOne({ _id: booking._id }, { razorpayOrderId: "order_pkg" });
    await handlePaymentCaptured({ orderId: "order_pkg", paymentId: "pay_p", amount: booking.amount });
    const permit = (await PermitRequest.findOne({ bookingId: booking._id }).lean())!;
    expect(permit.status).toBe("pending_docs");
    expect(permit.guestsExpected).toBe(2);
    // Two partners (operator + homestay) must both confirm.
    expect((await Booking.findById(booking._id).lean())!.partnerConfirmations).toHaveLength(2);
  });
});

describe("partner confirmation", () => {
  it("confirms the booking when every partner confirms, and checks the sender number", async () => {
    const { stay, booking } = await heldStay();
    await handlePaymentCaptured({ orderId: booking.razorpayOrderId, paymentId: "pay_1", amount: booking.amount });
    await expect(
      recordPartnerResponse({ bookingId: String(booking._id), partnerId: String(stay.owner._id), response: "confirm", fromPhone: "+910000000000", actor: "wa" }),
    ).rejects.toThrow();
    const out = await recordPartnerResponse({
      bookingId: String(booking._id),
      partnerId: String(stay.owner._id),
      response: "confirm",
      fromPhone: stay.owner.whatsapp,
      actor: "wa",
    });
    expect(out).toBe("confirmed_all");
    expect((await Booking.findById(booking._id).lean())!.status).toBe("confirmed");
  });
});

describe("cancellation", () => {
  it("uses the tier table", () => {
    expect(refundPctFor("2026-11-20", "2026-10-16")).toBe(90);
    expect(refundPctFor("2026-10-28", "2026-10-16")).toBe(50);
    expect(refundPctFor("2026-10-20", "2026-10-16")).toBe(0);
  });

  it("releases inventory and refunds (simulated without Razorpay keys)", async () => {
    const { booking } = await heldStay(); // trip is 20 days out: 90% tier
    await handlePaymentCaptured({ orderId: booking.razorpayOrderId, paymentId: "pay_1", amount: booking.amount });
    const q = await cancelBooking({ bookingId: String(booking._id), actor: "tourist", reason: "plans changed" });
    expect(q.refundPct).toBe(90);
    const b = (await Booking.findById(booking._id).lean())!;
    expect(b.status).toBe("refunded");
    expect(await Inventory.countDocuments({ status: "available" })).toBe(1);
  });
});

describe("webhook signature", () => {
  it("accepts a correct HMAC and rejects anything else", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const sig = createHmac("sha256", "whsec").update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, "whsec")).toBe(true);
    expect(verifyWebhookSignature(body + " ", sig, "whsec")).toBe(false);
    expect(verifyWebhookSignature(body, null, "whsec")).toBe(false);
  });
});

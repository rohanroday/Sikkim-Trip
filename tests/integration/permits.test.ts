import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { Booking, PermitRequest } from "@/server/db/models";
import { createHold } from "@/server/booking/createHold";
import { handlePaymentCaptured } from "@/server/booking/payment";
import { objectExists } from "@/server/storage/storage";
import { purgeExpiredGuestDocs, submitGuests, deleteDocsAfterFor } from "@/server/permits/permits";
import { makePackage, makeStay, resetDb, setupDb, TOURIST, TOURIST_PHONE } from "../helpers";

beforeAll(setupDb);
beforeEach(resetDb);
afterAll(() => mongoose.disconnect());

const guest = (name: string) => ({ name, age: 30, gender: "female" as const, nationality: "Indian", idType: "aadhaar" as const, idNumber: "1234 5678 9012" });
const file = () => ({ body: Buffer.from("fake-image"), contentType: "image/jpeg" });

async function paidPermitBooking() {
  const stay = await makeStay();
  const { pkg, date } = await makePackage(stay);
  const { booking } = await createHold({ kind: "package", packageSlug: pkg.slug, date, guests: 2, tourist: TOURIST }, TOURIST_PHONE);
  await Booking.updateOne({ _id: booking._id }, { razorpayOrderId: "order_x" });
  await handlePaymentCaptured({ orderId: "order_x", paymentId: "pay_x", amount: booking.amount });
  return booking;
}

describe("permit guest IDs", () => {
  it("requires consent and every guest, and stores only masked ID numbers", async () => {
    const booking = await paidPermitBooking();
    await expect(submitGuests({ bookingId: booking._id, guests: [guest("A"), guest("B")], files: [file(), file()], consent: false })).rejects.toThrow();
    await expect(submitGuests({ bookingId: booking._id, guests: [guest("A")], files: [file()], consent: true })).rejects.toThrow();
    const permit = await submitGuests({ bookingId: booking._id, guests: [guest("A"), guest("B")], files: [file(), file()], consent: true });
    expect(permit.status).toBe("ready");
    expect(permit.guests.map((g) => g.idNumberMasked)).toEqual(["9012", "9012"]);
    expect(JSON.stringify(permit)).not.toContain("5678");
  });

  it("purges ID files after trip end + 7 days and logs it", async () => {
    const booking = await paidPermitBooking();
    const permit = await submitGuests({ bookingId: booking._id, guests: [guest("A"), guest("B")], files: [file(), file()], consent: true });
    const keys = permit.guests.map((g) => g.idFileKey!);
    for (const k of keys) expect(await objectExists(k)).toBe(true);

    expect(await purgeExpiredGuestDocs(new Date())).toBe(0);
    const after = new Date(deleteDocsAfterFor(booking.endDate).getTime() + 1000);
    expect(await purgeExpiredGuestDocs(after)).toBe(1);
    const purged = (await PermitRequest.findById(permit._id).lean())!;
    expect(purged.docsPurgedAt).toBeTruthy();
    expect(purged.guests.every((g) => !g.idFileKey)).toBe(true);
    for (const k of keys) expect(await objectExists(k)).toBe(false);
  });
});

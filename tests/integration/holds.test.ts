import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { Booking, Departure, Inventory } from "@/lib/db/models";
import { createHold } from "@/lib/booking/createHold";
import { releaseExpiredHolds } from "@/lib/booking/expire";
import { HoldConflictError } from "@/lib/errors";
import { rupeesToPaise } from "@/lib/money";
import { inDays, makePackage, makeStay, resetDb, setupDb, TOURIST, TOURIST_PHONE } from "../helpers";

beforeAll(setupDb);
beforeEach(resetDb);
afterAll(() => mongoose.disconnect());

function stayInput(slug: string, roomId: string, checkIn: string, checkOut: string) {
  return { kind: "stay" as const, propertySlug: slug, roomId, checkIn, checkOut, guests: 2, tourist: TOURIST };
}

describe("room holds", () => {
  it("50 parallel attempts on the last room-night produce exactly one booking", async () => {
    const { property, rooms } = await makeStay({ nights: [inDays(10)] });
    const attempts = Array.from({ length: 50 }, (_, i) =>
      createHold(stayInput(property.slug, String(rooms[0]._id), inDays(10), inDays(11)), `+9198000${String(i).padStart(5, "0")}`),
    );
    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed.every((f) => f.reason instanceof HoldConflictError)).toBe(true);
    expect(await Booking.countDocuments({ status: "held" })).toBe(1);
    expect(await Inventory.countDocuments({ status: "held" })).toBe(1);
  });

  it("is all-or-nothing across nights", async () => {
    const { property, rooms, nights } = await makeStay({ nights: [inDays(10), inDays(11), inDays(12)] });
    await Inventory.updateOne({ roomId: rooms[0]._id, date: nights[2] }, { status: "booked" });
    await expect(
      createHold(stayInput(property.slug, String(rooms[0]._id), inDays(10), inDays(13)), TOURIST_PHONE),
    ).rejects.toBeInstanceOf(HoldConflictError);
    expect(await Inventory.countDocuments({ status: "held" })).toBe(0);
    expect(await Booking.countDocuments()).toBe(0);
  });

  it("prices a stay from nightly inventory and computes commission", async () => {
    const { property, rooms } = await makeStay();
    const { booking } = await createHold(stayInput(property.slug, String(rooms[0]._id), inDays(10), inDays(12)), TOURIST_PHONE);
    expect(booking.amount).toBe(rupeesToPaise(5000));
    expect(booking.commission).toBe(rupeesToPaise(500));
    expect(booking.status).toBe("held");
  });

  it("releases expired holds and makes the nights bookable again", async () => {
    const { property, rooms } = await makeStay({ nights: [inDays(10)] });
    const input = stayInput(property.slug, String(rooms[0]._id), inDays(10), inDays(11));
    const { booking } = await createHold(input, TOURIST_PHONE);

    expect(await releaseExpiredHolds(new Date())).toBe(0); // still inside 10 minutes
    const later = new Date(Date.now() + 11 * 60_000);
    expect(await releaseExpiredHolds(later)).toBe(1);
    expect((await Booking.findById(booking._id).lean())!.status).toBe("expired");
    expect(await Inventory.countDocuments({ status: "available" })).toBe(1);

    const second = await createHold(input, "+919811111111");
    expect(second.booking.status).toBe("held");
  });
});

describe("package holds", () => {
  it("holds seats and enough rooms for the group, and splits the price", async () => {
    const stay = await makeStay({
      rooms: [
        { name: "Room 1", capacity: 2, price: 2500 },
        { name: "Room 2", capacity: 2, price: 2500 },
      ],
    });
    const { pkg, date } = await makePackage(stay, { seats: 6 });
    const { booking } = await createHold({ kind: "package", packageSlug: pkg.slug, date, guests: 4, tourist: TOURIST }, TOURIST_PHONE);

    expect(booking.amount).toBe(rupeesToPaise(40000));
    const stayItems = booking.items.filter((i) => i.type === "stay");
    expect(stayItems).toHaveLength(2); // 4 guests need both 2-bed rooms
    const opItem = booking.items.find((i) => i.type === "package")!;
    expect(opItem.amount).toBe(rupeesToPaise(40000 - 2 * 2 * 2500));
    expect((await Departure.findOne({ packageId: pkg._id }).lean())!.seatsLeft).toBe(2);
    expect(await Inventory.countDocuments({ status: "held" })).toBe(4);
  });

  it("returns seats when the hold expires", async () => {
    const stay = await makeStay();
    const { pkg, date } = await makePackage(stay, { seats: 2 });
    await createHold({ kind: "package", packageSlug: pkg.slug, date, guests: 2, tourist: TOURIST }, TOURIST_PHONE);
    await releaseExpiredHolds(new Date(Date.now() + 11 * 60_000));
    expect((await Departure.findOne({ packageId: pkg._id }).lean())!.seatsLeft).toBe(2);
  });

  it("refuses when not enough seats are left", async () => {
    const stay = await makeStay({ rooms: [{ name: "Big", capacity: 4, price: 3000 }] });
    const { pkg, date } = await makePackage(stay, { seats: 3 });
    await expect(
      createHold({ kind: "package", packageSlug: pkg.slug, date, guests: 4, tourist: TOURIST }, TOURIST_PHONE),
    ).rejects.toBeInstanceOf(HoldConflictError);
  });
});

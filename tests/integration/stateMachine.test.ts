import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { BOOKING_STATUSES, Booking, AuditLog, type BookingStatus } from "@/server/db/models";
import { canTransition, transitionBooking } from "@/server/booking/stateMachine";
import { InvalidTransitionError } from "@/lib/errors";
import { resetDb, setupDb, TOURIST_PHONE } from "../helpers";

const ALLOWED: [BookingStatus, BookingStatus][] = [
  ["held", "paid"],
  ["held", "expired"],
  ["paid", "confirmed"],
  ["paid", "cancelled"],
  ["paid", "refunded"],
  ["confirmed", "completed"],
  ["confirmed", "cancelled"],
  ["expired", "paid"],
  ["expired", "refunded"],
  ["cancelled", "refunded"],
];

describe("booking state machine", () => {
  it("allows exactly the documented transitions", () => {
    for (const from of BOOKING_STATUSES) {
      for (const to of BOOKING_STATUSES) {
        const expected = ALLOWED.some(([f, t]) => f === from && t === to);
        expect(canTransition(from, to), `${from} -> ${to}`).toBe(expected);
      }
    }
  });

  describe("transitionBooking", () => {
    beforeAll(setupDb);
    beforeEach(resetDb);
    afterAll(() => mongoose.disconnect());

    async function seed(status: BookingStatus) {
      return Booking.create({
        code: "SK-TEST" + Math.random().toString(36).slice(2, 6),
        accessToken: "t",
        kind: "stay",
        tourist: { name: "P", phone: TOURIST_PHONE },
        startDate: "2030-01-01",
        endDate: "2030-01-02",
        guests: 1,
        items: [],
        amount: 100,
        commission: 10,
        status,
      });
    }

    it("records history and an audit entry", async () => {
      const b = await seed("held");
      const updated = await transitionBooking(b._id, "paid", { actor: "test" });
      expect(updated.status).toBe("paid");
      expect(updated.statusHistory.at(-1)).toMatchObject({ from: "held", to: "paid", actor: "test" });
      expect(await AuditLog.countDocuments({ entityId: String(b._id), action: "booking.paid" })).toBe(1);
    });

    it("rejects forbidden transitions", async () => {
      const b = await seed("completed");
      await expect(transitionBooking(b._id, "cancelled", { actor: "test" })).rejects.toBeInstanceOf(InvalidTransitionError);
    });

    it("lets only one of two racing transitions win", async () => {
      const b = await seed("held");
      const results = await Promise.allSettled([
        transitionBooking(b._id, "paid", { actor: "a" }),
        transitionBooking(b._id, "expired", { actor: "b" }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    });
  });
});

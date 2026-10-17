import type { ClientSession, Types } from "mongoose";
import { connectDB, withTransaction } from "@/server/db/connect";
import { Booking, type BookingDoc } from "@/server/db/models";
import { releaseBookingNights, releaseSeats } from "@/server/inventory/holds";
import { transitionBooking } from "@/server/booking/stateMachine";
import { InvalidTransitionError } from "@/lib/errors";

/** Give back every seat and room-night a booking holds. Runs inside the caller's transaction. */
export async function releaseBookingInventory(booking: Pick<BookingDoc, "_id" | "items">, session: ClientSession) {
  await releaseBookingNights(booking._id, session);
  for (const item of booking.items ?? []) {
    if (item.type === "package" && item.packageId && item.departureDate && item.seats) {
      await releaseSeats({ packageId: item.packageId, date: item.departureDate, seats: item.seats }, session);
    }
  }
}

async function expireOne(bookingId: Types.ObjectId): Promise<boolean> {
  try {
    await withTransaction(async (session) => {
      const booking = await Booking.findOne({ _id: bookingId, status: "held" }, null, { session }).lean<BookingDoc>();
      if (!booking) throw new InvalidTransitionError("?", "expired");
      await releaseBookingInventory(booking, session);
      await transitionBooking(bookingId, "expired", { actor: "system:hold-expiry", session, unset: ["holdExpiresAt"] });
    });
    return true;
  } catch (err) {
    // Paid or expired by someone else in the meantime: nothing to do.
    if (err instanceof InvalidTransitionError) return false;
    throw err;
  }
}

/** Release holds whose 10 minutes ran out. Safe to run concurrently and often. */
export async function releaseExpiredHolds(now: Date = new Date(), limit = 200): Promise<number> {
  await connectDB();
  const stale = await Booking.find({ status: "held", holdExpiresAt: { $lt: now } }, { _id: 1 })
    .limit(limit)
    .lean();
  let released = 0;
  for (const b of stale) if (await expireOne(b._id)) released++;
  return released;
}

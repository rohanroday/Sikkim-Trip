/**
 * Room-night and seat holds. Every function here takes an explicit session and
 * must run inside one transaction: a thrown HoldConflictError aborts the whole
 * booking, so partial holds never survive.
 */
import type { ClientSession, Types } from "mongoose";
import { Departure, Inventory, Room, type RoomDoc } from "@/lib/db/models";
import { HoldConflictError } from "@/lib/errors";
import type { NightDate } from "@/lib/dates";

export const HOLD_MINUTES = 10;

export function holdExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + HOLD_MINUTES * 60_000);
}

/** Flip every night of one room from available to held. All or nothing. */
export async function holdRoomNights(
  args: { roomId: Types.ObjectId; nights: NightDate[]; bookingId: Types.ObjectId; expiresAt: Date },
  session: ClientSession,
): Promise<void> {
  const res = await Inventory.updateMany(
    { roomId: args.roomId, date: { $in: args.nights }, status: "available" },
    { $set: { status: "held", bookingId: args.bookingId, holdExpiresAt: args.expiresAt, source: "platform" } },
    { session },
  );
  if (res.modifiedCount !== args.nights.length) throw new HoldConflictError();
}

/** Book nights directly (used when a late payment arrives for an expired hold). */
export async function bookRoomNightsDirect(
  args: { roomId: Types.ObjectId; nights: NightDate[]; bookingId: Types.ObjectId },
  session: ClientSession,
): Promise<void> {
  const res = await Inventory.updateMany(
    { roomId: args.roomId, date: { $in: args.nights }, status: "available" },
    { $set: { status: "booked", bookingId: args.bookingId, source: "platform" }, $unset: { holdExpiresAt: "" } },
    { session },
  );
  if (res.modifiedCount !== args.nights.length) throw new HoldConflictError();
}

export async function holdSeats(
  args: { packageId: Types.ObjectId; date: NightDate; seats: number },
  session: ClientSession,
): Promise<void> {
  const res = await Departure.updateOne(
    { packageId: args.packageId, date: args.date, status: "open", seatsLeft: { $gte: args.seats } },
    { $inc: { seatsLeft: -args.seats } },
    { session },
  );
  if (res.modifiedCount !== 1) throw new HoldConflictError("Not enough seats left on that date.");
}

export async function releaseSeats(
  args: { packageId: Types.ObjectId; date: NightDate; seats: number },
  session: ClientSession,
): Promise<void> {
  await Departure.updateOne({ packageId: args.packageId, date: args.date }, { $inc: { seatsLeft: args.seats } }, { session });
}

/** held -> booked for every night this booking holds. */
export async function confirmHeldNights(bookingId: Types.ObjectId, session: ClientSession): Promise<number> {
  const res = await Inventory.updateMany(
    { bookingId, status: "held" },
    { $set: { status: "booked" }, $unset: { holdExpiresAt: "" } },
    { session },
  );
  return res.modifiedCount;
}

/** Return every night this booking holds or has booked to available. */
export async function releaseBookingNights(bookingId: Types.ObjectId, session: ClientSession): Promise<number> {
  const res = await Inventory.updateMany(
    { bookingId, status: { $in: ["held", "booked"] } },
    { $set: { status: "available" }, $unset: { bookingId: "", holdExpiresAt: "" } },
    { session },
  );
  return res.modifiedCount;
}

/**
 * Pick rooms at a property that are free on every one of the nights and together
 * fit the guests. Larger rooms first, so a group uses as few rooms as possible.
 * The read is advisory; holdRoomNights is the real guard.
 */
export async function pickRoomsForGuests(
  args: { propertyId: Types.ObjectId; nights: NightDate[]; guests: number },
  session: ClientSession,
): Promise<RoomDoc[]> {
  const rooms = await Room.find({ propertyId: args.propertyId, active: true }, null, { session })
    .sort({ capacity: -1 })
    .lean<RoomDoc[]>();
  if (!rooms.length) throw new HoldConflictError("No rooms are set up at this stay yet.");

  const free = await Inventory.aggregate<{ _id: Types.ObjectId; n: number }>(
    [
      { $match: { propertyId: args.propertyId, date: { $in: args.nights }, status: "available" } },
      { $group: { _id: "$roomId", n: { $sum: 1 } } },
    ],
    { session },
  );
  const fullyFree = new Set(free.filter((f) => f.n === args.nights.length).map((f) => String(f._id)));

  const chosen: RoomDoc[] = [];
  let seats = 0;
  for (const room of rooms) {
    if (seats >= args.guests) break;
    if (!fullyFree.has(String(room._id))) continue;
    chosen.push(room);
    seats += room.capacity;
  }
  if (seats < args.guests) throw new HoldConflictError("This stay is full on one of those nights.");
  return chosen;
}

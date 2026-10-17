/**
 * The ONLY place booking.status changes. Every transition is atomic (guarded on
 * the current status), appends statusHistory, and writes an audit log entry.
 */
import type { ClientSession, Types, UpdateQuery } from "mongoose";
import { Booking, type BookingDoc, type BookingFields, type BookingStatus } from "@/server/db/models";
import { InvalidTransitionError, NotFoundError } from "@/lib/errors";
import { audit } from "@/server/audit";

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  held: ["paid", "expired"],
  paid: ["confirmed", "cancelled", "refunded"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  // A payment can land after the hold expired: rebook if the nights are still free, else refund.
  expired: ["paid", "refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedNext(from: BookingStatus): readonly BookingStatus[] {
  return TRANSITIONS[from];
}

export async function transitionBooking(
  bookingId: Types.ObjectId | string,
  to: BookingStatus,
  opts: {
    actor: string;
    note?: string;
    session?: ClientSession;
    /** Extra fields to set in the same atomic write (e.g. payment ids). */
    set?: Partial<Record<keyof BookingFields | `${string}.${string}`, unknown>>;
    unset?: string[];
  },
): Promise<BookingDoc> {
  const current = await Booking.findById(bookingId, { status: 1 }, { session: opts.session }).lean();
  if (!current) throw new NotFoundError("Booking not found.");
  const from = current.status as BookingStatus;
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);

  const update: UpdateQuery<BookingFields> = {
    $set: { ...(opts.set ?? {}), status: to },
    $push: { statusHistory: { from, to, at: new Date(), actor: opts.actor, note: opts.note } },
  };
  if (opts.unset?.length) update.$unset = Object.fromEntries(opts.unset.map((k) => [k, ""]));

  const updated = await Booking.findOneAndUpdate({ _id: bookingId, status: from }, update, {
    new: true,
    session: opts.session,
  }).lean<BookingDoc>();
  // Someone else moved it between our read and write.
  if (!updated) throw new InvalidTransitionError(from, to);

  await audit(
    {
      actor: opts.actor,
      action: `booking.${to}`,
      entity: "booking",
      entityId: String(bookingId),
      before: { status: from },
      after: { status: to, note: opts.note },
    },
    opts.session,
  );
  return updated;
}

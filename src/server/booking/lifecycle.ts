import { connectDB } from "@/server/db/connect";
import { Booking } from "@/server/db/models";
import { transitionBooking } from "@/server/booking/stateMachine";
import { todayIST } from "@/lib/dates";
import { InvalidTransitionError } from "@/lib/errors";

/** Confirmed bookings whose end date has passed become completed. */
export async function completeFinishedTrips(now: Date = new Date()): Promise<number> {
  await connectDB();
  const today = todayIST(now);
  const done = await Booking.find({ status: "confirmed", endDate: { $lt: today } }, { _id: 1 }).limit(500).lean();
  let n = 0;
  for (const b of done) {
    try {
      await transitionBooking(b._id, "completed", { actor: "system:daily" });
      n++;
    } catch (err) {
      if (!(err instanceof InvalidTransitionError)) throw err;
    }
  }
  return n;
}

import { connectDB } from "@/lib/db/connect";
import { Booking, type BookingDoc } from "@/lib/db/models";
import { tokensMatch } from "@/lib/booking/code";
import { NotFoundError } from "@/lib/errors";

/** Load a booking for the tourist's magic link. Wrong token looks the same as no booking. */
export async function bookingForToken(code: string, token: string | undefined | null): Promise<BookingDoc> {
  await connectDB();
  const b = await Booking.findOne({ code }).select("+accessToken").lean<BookingDoc & { accessToken: string }>();
  if (!b || !tokensMatch(b.accessToken, token)) throw new NotFoundError("Booking not found.");
  const { accessToken: _omit, ...rest } = b;
  void _omit;
  return rest as BookingDoc;
}

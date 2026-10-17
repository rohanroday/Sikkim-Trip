import { z } from "zod";
import { handle } from "@/server/http";
import { bookingForToken } from "@/server/booking/access";
import { cancelBooking, cancellationQuote } from "@/server/booking/cancel";
import { ValidationError } from "@/lib/errors";

const schema = z.object({ token: z.string().min(10), confirm: z.boolean().default(false), reason: z.string().max(300).default("") });

/** T-10: preview the refund (confirm=false), then cancel (confirm=true). */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await params;
    const body = schema.parse(await req.json());
    const booking = await bookingForToken(code, body.token);
    const quote = cancellationQuote(booking);
    if (!quote) throw new ValidationError("This booking can no longer be cancelled online. Message us on WhatsApp.");
    if (!body.confirm) return quote;
    return cancelBooking({ bookingId: String(booking._id), actor: "tourist", reason: body.reason || "cancelled by tourist" });
  });
}

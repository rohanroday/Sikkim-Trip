import { z } from "zod";
import { handle } from "@/lib/http";
import { bookingForToken } from "@/lib/booking/access";
import { guestSchema } from "@/lib/booking/schemas";
import { submitGuests } from "@/lib/permits/permits";
import { ValidationError } from "@/lib/errors";

/** T-08: guest list + one ID file per guest, as multipart form data. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await params;
    const form = await req.formData();
    const booking = await bookingForToken(code, String(form.get("token") ?? ""));
    if (!["paid", "confirmed"].includes(booking.status)) throw new ValidationError("IDs can be added once the booking is paid.");

    const guests = z.array(guestSchema).min(1).max(20).parse(JSON.parse(String(form.get("guests") ?? "[]")));
    const files = [];
    for (let i = 0; i < guests.length; i++) {
      const f = form.get(`file${i}`);
      if (!(f instanceof File)) throw new ValidationError(`Please add an ID photo for guest ${i + 1}.`);
      files.push({ body: Buffer.from(await f.arrayBuffer()), contentType: f.type });
    }
    const permit = await submitGuests({ bookingId: booking._id, guests, files, consent: form.get("consent") === "yes" });
    return { status: permit.status };
  });
}

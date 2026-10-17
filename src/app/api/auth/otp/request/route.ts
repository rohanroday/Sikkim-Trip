import { z } from "zod";
import { handle } from "@/server/http";
import { requestOtp } from "@/server/auth/otp";
import { normalizePhone } from "@/lib/phone";
import { ValidationError } from "@/lib/errors";

const schema = z.object({ phone: z.string().min(8).max(20) });

export async function POST(req: Request) {
  return handle(async () => {
    const { phone } = schema.parse(await req.json());
    const e164 = normalizePhone(phone);
    if (!e164) throw new ValidationError("Please enter a valid mobile number.");
    return requestOtp(e164);
  });
}

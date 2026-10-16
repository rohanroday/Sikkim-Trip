import { z } from "zod";
import { handle } from "@/lib/http";
import { verifyOtp } from "@/lib/auth/otp";
import { isAdminPhone, setSession } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/phone";
import { ForbiddenError, ValidationError } from "@/lib/errors";

const schema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
  admin: z.boolean().optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const body = schema.parse(await req.json());
    const phone = normalizePhone(body.phone);
    if (!phone) throw new ValidationError("Please enter a valid mobile number.");
    if (body.admin && !isAdminPhone(phone)) throw new ForbiddenError("This number is not an admin.");
    await verifyOtp(phone, body.code);
    await setSession({ phone, role: body.admin ? "admin" : "tourist" });
    return { phone };
  });
}

import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { connectDB } from "@/lib/db/connect";
import { OtpCode } from "@/lib/db/models";
import { env } from "@/lib/env";
import { RateLimitError, ValidationError } from "@/lib/errors";
import { sendTemplate, isWhatsappConfigured } from "@/lib/whatsapp/client";

const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MS = 10 * 60_000;

function hash(phone: string, code: string): string {
  return createHmac("sha256", env.sessionSecret).update(`${phone}:${code}`).digest("hex");
}

/**
 * Send a 6-digit code over WhatsApp. In local development without WhatsApp
 * configured, the code is returned so the UI can show it (never logged).
 */
export async function requestOtp(phone: string, now = new Date()): Promise<{ devCode?: string }> {
  await connectDB();
  const recent = await OtpCode.countDocuments({ phone, createdAt: { $gt: new Date(now.getTime() - SEND_WINDOW_MS) } });
  if (recent >= MAX_SENDS_PER_WINDOW) throw new RateLimitError();

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await OtpCode.create({ phone, codeHash: hash(phone, code), expiresAt: new Date(now.getTime() + OTP_TTL_MS), createdAt: now });

  await sendTemplate({ to: phone, template: "otp_code", bodyParams: [code], urlButtonParam: code });
  const exposeForDev = !env.isProd && !isWhatsappConfigured();
  return exposeForDev ? { devCode: code } : {};
}

export async function verifyOtp(phone: string, code: string, now = new Date()): Promise<void> {
  await connectDB();
  const latest = await OtpCode.findOne({ phone, usedAt: null }).sort({ createdAt: -1 });
  if (!latest || latest.expiresAt < now) throw new ValidationError("That code has expired. Ask for a new one.");
  if (latest.attempts >= MAX_ATTEMPTS) throw new RateLimitError("Too many wrong tries. Ask for a new code.");

  const a = Buffer.from(latest.codeHash);
  const b = Buffer.from(hash(phone, code.trim()));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await OtpCode.updateOne({ _id: latest._id }, { $inc: { attempts: 1 } });
    throw new ValidationError("That code is not right. Please check and try again.");
  }
  await OtpCode.updateOne({ _id: latest._id }, { usedAt: now });
}

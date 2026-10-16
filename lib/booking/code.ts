import { randomBytes, timingSafeEqual } from "crypto";

// No 0/O/1/I/L so codes read cleanly over a phone call.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function newBookingCode(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `SK-${out}`;
}

export function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function tokensMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

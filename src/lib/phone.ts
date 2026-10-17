/** Normalise Indian and international numbers to E.164 (+91XXXXXXXXXX). */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (/^\+\d{10,15}$/.test(digits)) return digits;
  const bare = digits.replace(/^\+/, "");
  if (/^[6-9]\d{9}$/.test(bare)) return `+91${bare}`;
  if (/^0[6-9]\d{9}$/.test(bare)) return `+91${bare.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(bare)) return `+${bare}`;
  return null;
}

/** For logs and partner views before confirmation: +91•••••43210 */
export function maskPhone(phone: string): string {
  if (phone.length <= 5) return "•••";
  return phone.slice(0, 3) + "•".repeat(Math.max(0, phone.length - 8)) + phone.slice(-5);
}

/** WhatsApp Cloud API wants digits only. */
export function toWhatsappId(phone: string): string {
  return phone.replace(/\D/g, "");
}

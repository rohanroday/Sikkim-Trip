/** Central access to environment config. Secrets are read lazily so tests can set them. */
export const env = {
  get mongoUri() {
    return process.env.MONGODB_URI ?? "";
  },
  get siteUrl() {
    const set = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    // On Vercel, a forgotten localhost value falls back to the project's production URL.
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (vercel && (!set || set.includes("localhost"))) return `https://${vercel}`;
    return set || "http://localhost:3000";
  },
  get sessionSecret() {
    const s = process.env.SESSION_SECRET;
    if (s && s.length >= 32) return s;
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (32+ chars)");
    return "dev-only-session-secret-change-me-0123456789";
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get adminPhones(): string[] {
    return (process.env.ADMIN_PHONES ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  },
  get adminAlertWhatsapp() {
    return process.env.ADMIN_ALERT_WHATSAPP ?? "";
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
  /**
   * Public test mode: shows a banner and, while WhatsApp is not connected, shows
   * sign-in codes on screen. Never on with live Razorpay keys.
   */
  get testMode() {
    if ((process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_live_")) return false;
    return process.env.NEXT_PUBLIC_TEST_MODE === "true";
  },
};

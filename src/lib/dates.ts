/**
 * Night dates are "YYYY-MM-DD" strings in Asia/Kolkata. Timestamps are UTC Dates.
 * Never use server-local time for night boundaries.
 */
export type NightDate = string;

export const TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const NIGHT_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isNightDate(value: string): value is NightDate {
  if (!NIGHT_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function todayIST(now: Date = new Date()): NightDate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: NightDate, days: number): NightDate {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: NightDate, b: NightDate): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Nights from checkIn (inclusive) to checkOut (exclusive). */
export function nightsBetween(checkIn: NightDate, checkOut: NightDate): NightDate[] {
  const n = diffDays(checkIn, checkOut);
  if (n <= 0) return [];
  return Array.from({ length: n }, (_, i) => addDays(checkIn, i));
}

/** The UTC instant of 00:00 IST on the given date. */
export function istStartOfDay(date: NightDate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

export function formatNight(date: NightDate, opts: { weekday?: boolean } = { weekday: true }): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: opts.weekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

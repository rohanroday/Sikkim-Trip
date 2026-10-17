import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/http";
import { completeFinishedTrips } from "@/lib/booking/lifecycle";
import { purgeExpiredGuestDocs } from "@/lib/permits/permits";
import { releaseExpiredHolds } from "@/lib/booking/expire";
import { escalateLateConfirmations } from "@/lib/booking/confirmations";

/**
 * Runs at 02:00 IST (the only cron the Vercel Hobby plan allows): finish trips,
 * purge guest IDs past retention, sweep stale holds, escalate late partners.
 * For faster sweeps, point an external cron at /api/cron/release-holds and /api/cron/partner-sla.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const completed = await completeFinishedTrips();
  const purged = await purgeExpiredGuestDocs();
  const released = await releaseExpiredHolds();
  const escalated = await escalateLateConfirmations();
  return NextResponse.json({ completed, purged, released, escalated });
}

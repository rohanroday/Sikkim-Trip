import { NextResponse } from "next/server";
import { cronAuthorized } from "@/server/http";
import { completeFinishedTrips } from "@/server/booking/lifecycle";
import { purgeExpiredGuestDocs } from "@/server/permits/permits";
import { releaseExpiredHolds } from "@/server/booking/expire";
import { escalateLateConfirmations } from "@/server/booking/confirmations";

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

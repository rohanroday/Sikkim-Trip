import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/http";
import { completeFinishedTrips } from "@/lib/booking/lifecycle";
import { purgeExpiredGuestDocs } from "@/lib/permits/permits";
import { releaseExpiredHolds } from "@/lib/booking/expire";

/** Runs at 02:00 IST: finish trips, purge guest IDs past retention, sweep stale holds. */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [completed, purged, released] = [await completeFinishedTrips(), await purgeExpiredGuestDocs(), await releaseExpiredHolds()];
  return NextResponse.json({ completed, purged, released });
}

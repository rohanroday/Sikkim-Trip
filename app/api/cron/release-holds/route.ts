import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/http";
import { releaseExpiredHolds } from "@/lib/booking/expire";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const released = await releaseExpiredHolds();
  return NextResponse.json({ released });
}

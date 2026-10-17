import { NextResponse } from "next/server";
import { cronAuthorized } from "@/server/http";
import { releaseExpiredHolds } from "@/server/booking/expire";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const released = await releaseExpiredHolds();
  return NextResponse.json({ released });
}

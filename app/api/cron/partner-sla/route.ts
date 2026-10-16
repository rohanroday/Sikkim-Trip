import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/http";
import { escalateLateConfirmations } from "@/lib/booking/confirmations";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const escalated = await escalateLateConfirmations();
  return NextResponse.json({ escalated });
}

import { NextResponse } from "next/server";
import { cronAuthorized } from "@/server/http";
import { escalateLateConfirmations } from "@/server/booking/confirmations";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const escalated = await escalateLateConfirmations();
  return NextResponse.json({ escalated });
}

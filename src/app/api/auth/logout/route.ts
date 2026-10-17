import { NextResponse } from "next/server";
import { clearSession } from "@/server/auth/session";

export async function POST(req: Request) {
  await clearSession();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}

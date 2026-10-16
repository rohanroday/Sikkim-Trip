import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "@/lib/errors";

/** Map domain errors to HTTP responses. Route handlers wrap their body in this. */
export async function handle(fn: () => Promise<Response | unknown>): Promise<Response> {
  try {
    const out = await fn();
    return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input.", code: "validation_error" }, { status: 400 });
    }
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.httpStatus });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong on our side. Please try again.", code: "server_error" }, { status: 500 });
  }
}

/** Cron routes: Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

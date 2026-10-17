import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/server/env";
import { UnauthorizedError } from "@/lib/errors";

export type Role = "tourist" | "admin";
export type Session = { phone: string; role: Role };

const COOKIE = "skt_session";
const MAX_AGE_SECONDS: Record<Role, number> = { tourist: 60 * 60 * 24 * 7, admin: 60 * 60 * 12 };

function key() {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ phone: s.phone, role: s.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS[s.role]}s`)
    .sign(key());
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.phone !== "string" || (payload.role !== "tourist" && payload.role !== "admin")) return null;
    return { phone: payload.phone, role: payload.role };
  } catch {
    return null;
  }
}

export async function setSession(s: Session): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, await signSession(s), {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS[s.role],
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  return verifySessionToken((await cookies()).get(COOKIE)?.value);
}

export function isAdminPhone(phone: string): boolean {
  return env.adminPhones.includes(phone);
}

/** For route handlers: throws if not signed in. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new UnauthorizedError();
  return s;
}

/** Admin role is re-checked against ADMIN_PHONES on every request. */
export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (!s || s.role !== "admin" || !isAdminPhone(s.phone)) throw new UnauthorizedError("Admin sign-in required.");
  return s;
}

/** For admin pages: redirect to login instead of throwing. */
export async function requireAdminPage(): Promise<Session> {
  const s = await getSession();
  if (!s || s.role !== "admin" || !isAdminPhone(s.phone)) redirect("/admin/login");
  return s;
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/session";
import { maskPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "Overview"],
  ["/admin/bookings", "Bookings"],
  ["/admin/permits", "Permits"],
  ["/admin/partners", "Partners"],
  ["/admin/stays", "Stays & rooms"],
  ["/admin/packages", "Packages"],
  ["/admin/routes", "Route closures"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="bg-ink px-4 py-5 text-snow lg:min-h-svh">
        <Link href="/admin" className="font-display text-lg font-extrabold">Sikkim Trip admin</Link>
        <nav aria-label="Admin" className="mt-6">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {NAV.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-sm text-snow/80 hover:bg-snow/10 hover:text-snow">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-8 hidden text-xs text-snow/60 lg:block">
          Signed in as <span className="font-mono">{maskPhone(session.phone)}</span>
          <form action="/api/auth/logout" method="post" className="mt-2">
            <button className="underline">Sign out</button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}

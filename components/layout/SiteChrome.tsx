import Link from "next/link";
import { site, whatsappLink } from "@/lib/site";
import { activeAlerts, ROUTE_LABELS } from "@/lib/routes";
import { formatNight, todayIST } from "@/lib/dates";
import type { RouteName } from "@/lib/db/models";
import { connectDB } from "@/lib/db/connect";

export function SiteNav() {
  const links = [
    { href: "/packages", label: "Trips" },
    { href: "/stays", label: "Homestays" },
    { href: "/#how", label: "How it works" },
    { href: "/#faq", label: "Questions" },
  ];
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
          <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="#14251f" />
            <path d="M8 48 L24 22 L31 32 L40 16 L56 48 Z" fill="#eef2ef" />
            <rect x="8" y="50" width="48" height="4" rx="2" fill="#b3263e" />
          </svg>
          {site.name}
        </Link>
        <ul className="hidden items-center gap-7 text-[0.95rem] font-medium md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-ink/80 transition-colors hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <details className="relative md:hidden">
          <summary className="btn btn-ghost list-none bg-snow/80 px-4 [&::-webkit-details-marker]:hidden">Menu</summary>
          <ul className="absolute right-0 mt-2 w-52 rounded-2xl bg-panel p-2 shadow-xl">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex min-h-12 items-center rounded-xl px-3 hover:bg-panel-2">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </nav>
    </header>
  );
}

/** Route closures and restrictions, set by admin (A-10). Fails quietly if the DB is down. */
export async function RouteBanner() {
  let alerts: Awaited<ReturnType<typeof activeAlerts>> = [];
  try {
    await connectDB();
    alerts = await activeAlerts(todayIST());
  } catch {
    return null;
  }
  if (!alerts.length) return null;
  return (
    <div role="status" className="relative z-40 bg-ink text-snow">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2.5 text-sm sm:px-6">
        {alerts.map((a) => (
          <p key={String(a._id)}>
            <span className="font-mono text-xs uppercase tracking-widest text-[#f2b8c2]">{a.status === "closed" ? "Road closed" : "Restricted"}</span>{" "}
            <strong>{ROUTE_LABELS[a.route as RouteName] ?? a.route}</strong>, {formatNight(a.from, { weekday: false })} to{" "}
            {formatNight(a.to, { weekday: false })}. {a.note} Trips on this road are paused.
          </p>
        ))}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-snow/85">
      <div aria-hidden="true" className="flex h-2">
        {["#2c6680", "#f6f7f3", "#b3263e", "#1f6b45", "#d9a521"].map((c) => (
          <span key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-xl font-extrabold text-snow">{site.name}</p>
          <p className="mt-3 max-w-[42ch] text-sm leading-relaxed">
            We are a booking partner of Sikkim-registered tour operators. Permit trips are run by the operator named on each trip, who files your
            RAP or PAP permit with the state.
          </p>
          <a href={whatsappLink("Hi, I have a question about a Sikkim trip.")} className="btn btn-light mt-5" target="_blank" rel="noopener noreferrer">
            Message us on WhatsApp
          </a>
        </div>
        <div>
          <p className="kicker !text-snow/60">Book</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/packages" className="hover:text-snow">All trips</Link></li>
            <li><Link href="/stays" className="hover:text-snow">Homestays</Link></li>
            <li><Link href="/stays?town=Lachung" className="hover:text-snow">Lachung stays</Link></li>
            <li><Link href="/stays?town=Pelling" className="hover:text-snow">Pelling stays</Link></li>
          </ul>
        </div>
        <div>
          <p className="kicker !text-snow/60">Policies</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/cancellation-policy" className="hover:text-snow">Cancellation and refunds</Link></li>
            <li><Link href="/privacy" className="hover:text-snow">Privacy and your IDs</Link></li>
            <li><Link href="/terms" className="hover:text-snow">Terms</Link></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-10 text-xs text-snow/55 sm:px-6">© {new Date().getFullYear()} {site.name}. Prices include taxes.</p>
    </footer>
  );
}

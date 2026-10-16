import Link from "next/link";
import type { PackageCard } from "@/lib/catalog";
import { formatINR } from "@/lib/money";
import { formatNight } from "@/lib/dates";

/** The signature element: every trip is sold like a stamped fare ticket. */
export default function FareTicket({ pkg, className = "" }: { pkg: PackageCard; className?: string }) {
  const nights = Math.max(0, pkg.durationDays - 1);
  return (
    <Link href={`/packages/${pkg.slug}`} className={`ticket group flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3 p-6 pb-5">
        <div>
          <p className="kicker">{pkg.region}</p>
          <h3 className="mt-2 font-display text-2xl font-extrabold leading-tight text-ink">{pkg.title}</h3>
        </div>
        {pkg.permitType !== "none" && (
          <span className="shrink-0 rounded-full bg-panel-2 px-2.5 py-1 font-mono text-[0.7rem] font-medium uppercase tracking-wider text-ink-2">
            {pkg.permitType} permit
          </span>
        )}
      </div>
      <p className="px-6 text-[0.95rem] leading-relaxed text-ink-2" style={{ maxWidth: "46ch" }}>
        {pkg.summary}
      </p>
      <div className="mt-auto pt-6">
        <div className="ticket-tear" aria-hidden="true" />
        <div className="flex items-end justify-between gap-3 p-6 pt-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Fixed fare, per {pkg.priceUnit === "vehicle" ? "vehicle" : "person"}</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-ink">{formatINR(pkg.price)}</p>
            <p className="mt-1 text-sm text-ink-2">
              {pkg.durationDays === 1 ? "Day trip" : `${nights}N / ${pkg.durationDays}D`}
              {pkg.nextDate ? ` · next ${formatNight(pkg.nextDate, { weekday: false })}` : " · dates coming soon"}
            </p>
          </div>
          <span className="stamp text-[0.7rem] transition-transform duration-500 group-hover:rotate-[-2deg]">Fixed</span>
        </div>
      </div>
    </Link>
  );
}

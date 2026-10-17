import Link from "next/link";
import type { PackageCard } from "@/server/catalog";
import { formatINR } from "@/lib/money";
import { formatNight } from "@/lib/dates";
import Photo from "@/components/ui/Photo";
import StayArt from "@/components/catalog/StayArt";

/** The signature element: every trip is sold like a stamped fare ticket, with its photo on top. */
export default function FareTicket({ pkg, className = "" }: { pkg: PackageCard; className?: string }) {
  const nights = Math.max(0, pkg.durationDays - 1);
  return (
    <Link href={`/packages/${pkg.slug}`} className={`ticket flex flex-col overflow-hidden ${className}`}>
      <div className="relative aspect-[16/10] overflow-hidden">
        {pkg.image ? <Photo src={pkg.image.url} alt={pkg.image.alt} /> : <StayArt seed={pkg.slug} className="h-full w-full" />}
        {pkg.permitType !== "none" && (
          <span className="absolute left-3 top-3 rounded-full bg-snow/95 px-2.5 py-1 font-mono text-[0.7rem] font-medium uppercase tracking-wider text-ink">
            {pkg.permitType} permit included
          </span>
        )}
      </div>
      <div className="p-6 pb-5">
        <p className="kicker">{pkg.region}</p>
        <h3 className="mt-1.5 font-display text-2xl font-extrabold leading-tight text-ink">{pkg.title}</h3>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2" style={{ maxWidth: "46ch" }}>{pkg.summary}</p>
      </div>
      <div className="mt-auto">
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
          <span className="stamp text-[0.7rem]">Fixed</span>
        </div>
      </div>
    </Link>
  );
}

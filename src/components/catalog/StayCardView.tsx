import Link from "next/link";
import type { StayCard } from "@/server/catalog";
import { formatINR } from "@/lib/money";
import StayArt from "@/components/catalog/StayArt";
import Photo from "@/components/ui/Photo";

export default function StayCardView({ stay }: { stay: StayCard }) {
  return (
    <Link href={`/stays/${stay.slug}`} className="ticket flex flex-col overflow-hidden">
      <div className="media relative aspect-[16/10] overflow-hidden">
        {stay.photo ? <Photo src={stay.photo.url} alt={stay.photo.alt} /> : <StayArt seed={stay.slug} className="h-full w-full" />}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[0.7rem] font-medium uppercase tracking-wider ${
            stay.freeTonight ? "bg-snow text-ok" : "bg-snow/90 text-ink-2"
          }`}
        >
          {stay.freeTonight ? "Free tonight" : "Check dates"}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="kicker">{stay.town} · {stay.type}</p>
        <h3 className="mt-1.5 font-display text-xl font-extrabold text-ink">{stay.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-2">{stay.summary}</p>
        <p className="mt-auto pt-4 text-sm text-ink-2">
          {stay.fromPrice != null ? (
            <>
              From <span className="font-display text-lg font-extrabold text-ink">{formatINR(stay.fromPrice)}</span> a night
            </>
          ) : (
            "Dates opening soon"
          )}
        </p>
      </div>
    </Link>
  );
}

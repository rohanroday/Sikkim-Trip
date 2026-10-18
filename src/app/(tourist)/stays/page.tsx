import type { Metadata } from "next";
import SearchBar from "@/components/catalog/SearchBar";
import StayCardView from "@/components/catalog/StayCardView";
import { listLiveStays } from "@/server/catalog";
import { TOWNS } from "@/server/db/models/Property";
import { isNightDate } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Homestays in Sikkim with live availability",
  description: "Family-run homestays in Gangtok, Pelling, Lachung and more. See which rooms are free and book online.",
};

type Props = { searchParams: Promise<{ town?: string; date?: string }> };

export default async function StaysPage({ searchParams }: Props) {
  const sp = await searchParams;
  const town = (TOWNS as readonly string[]).includes(sp.town ?? "") ? sp.town! : "";
  const date = sp.date && isNightDate(sp.date) ? sp.date : "";
  const stays = await listLiveStays(town || undefined);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <p className="kicker">Homestays and small hotels</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        {town ? `Stays in ${town}` : "Stay with a Sikkimese family."}
      </h1>
      <p className="mt-4 text-lg text-ink-2" style={{ maxWidth: "54ch" }}>
        Every room here shows real availability, updated by the owner. Book a night or two, or pick a full trip with stays included.
      </p>
      <div className="mt-8">
        <SearchBar town={town} date={date} />
      </div>
      <div data-reveal-stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stays.map((s) => (
          <StayCardView key={s.slug} stay={s} />
        ))}
      </div>
      {stays.length === 0 && <p className="mt-10 text-ink-2">No stays listed here yet. Try another town.</p>}
    </div>
  );
}

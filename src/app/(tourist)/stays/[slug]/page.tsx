import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStay } from "@/server/catalog";
import { formatINR } from "@/lib/money";
import StayArt from "@/components/catalog/StayArt";
import StayBooker from "@/components/catalog/StayBooker";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ date?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stay = await getStay((await params).slug);
  if (!stay) return { title: "Stay not found" };
  return {
    title: `${stay.name}, ${stay.town}`,
    description: stay.summary || `${stay.type} in ${stay.town}, Sikkim. Live availability.`,
    alternates: { canonical: `/stays/${stay.slug}` },
  };
}

export default async function StayPage({ params, searchParams }: Props) {
  const stay = await getStay((await params).slug);
  if (!stay) notFound();
  const { date } = await searchParams;

  const ld = {
    "@context": "https://schema.org",
    "@type": stay.type === "hotel" ? "Hotel" : "LodgingBusiness",
    name: stay.name,
    description: stay.summary,
    address: { "@type": "PostalAddress", addressLocality: stay.town, addressRegion: "Sikkim", addressCountry: "IN" },
    amenityFeature: stay.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
    priceRange: stay.fromPrice != null ? `From ${formatINR(stay.fromPrice)}` : undefined,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-28 sm:px-6 sm:pt-32">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
        <Link href="/stays" className="hover:text-ink">Homestays</Link> <span aria-hidden="true">/</span>{" "}
        <Link href={`/stays?town=${stay.town}`} className="hover:text-ink">{stay.town}</Link>
      </nav>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{stay.name}</h1>
      <p className="mt-2 text-ink-2">{stay.town}, Sikkim · {stay.type === "homestay" ? "Family-run homestay" : "Hotel"}</p>

      <div className="mt-8 overflow-hidden rounded-[24px]">
        {stay.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- partner photo URLs come from arbitrary hosts
          <img src={stay.photo.url} alt={stay.photo.alt} className="aspect-[21/9] w-full object-cover" />
        ) : (
          <StayArt seed={stay.slug} className="aspect-[21/9] w-full" />
        )}
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-lg leading-relaxed text-ink-2" style={{ maxWidth: "62ch" }}>{stay.description || stay.summary}</p>

          {stay.amenities.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl font-extrabold">What is here</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {stay.amenities.map((a) => (
                  <li key={a} className="rounded-full bg-panel px-3.5 py-1.5 text-sm">{a}</li>
                ))}
              </ul>
            </section>
          )}

          {stay.distances.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl font-extrabold">How far things are</h2>
              <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {stay.distances.map((d) => (
                  <div key={d.sight} className="flex items-baseline justify-between border-b border-line py-2">
                    <dt>{d.sight}</dt>
                    <dd className="font-mono text-sm text-ink-2">{d.km} km</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {stay.houseRules.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl font-extrabold">House rules</h2>
              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-ink-2">
                {stay.houseRules.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </section>
          )}
          {stay.registrationNo && (
            <p className="mt-10 text-sm text-ink-2">Registered with Sikkim Tourism: <span className="font-mono">{stay.registrationNo}</span></p>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <StayBooker slug={stay.slug} rooms={stay.rooms} initialDate={date ?? ""} />
        </aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}

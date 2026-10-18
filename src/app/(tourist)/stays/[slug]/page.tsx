import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStay } from "@/server/catalog";
import { formatINR } from "@/lib/money";
import StayArt from "@/components/catalog/StayArt";
import Photo from "@/components/ui/Photo";
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
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
        <Link href="/stays" className="hover:text-ink">Homestays</Link> <span aria-hidden="true">/</span>{" "}
        <Link href={`/stays?town=${stay.town}`} className="hover:text-ink">{stay.town}</Link>
      </nav>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{stay.name}</h1>
      <p className="mt-2 text-ink-2">{stay.town}, Sikkim · {stay.type === "homestay" ? "Family-run homestay" : "Hotel"}</p>

      {stay.photos.length >= 3 ? (
        <div className="mt-8 grid gap-2 overflow-hidden rounded-[24px] sm:grid-cols-[2fr_1fr] sm:grid-rows-2">
          <div className="relative aspect-[4/3] overflow-hidden sm:row-span-2 sm:aspect-auto">
            <div data-parallax className="absolute inset-x-0 -bottom-[7%] -top-[7%]">
              <Photo src={stay.photos[0].url} alt={stay.photos[0].alt} priority sizes="(max-width: 640px) 100vw, 66vw" />
            </div>
          </div>
          {stay.photos.slice(1, 3).map((p) => (
            <div key={p.url} className="relative hidden aspect-[4/3] sm:block">
              <Photo src={p.url} alt={p.alt} sizes="33vw" />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[24px] sm:aspect-[21/9]">
          <div data-parallax className="absolute inset-x-0 -bottom-[7%] -top-[7%]">
            {stay.photos[0] ? (
              <Photo src={stay.photos[0].url} alt={stay.photos[0].alt} priority sizes="(max-width: 1200px) 100vw, 1152px" />
            ) : (
              <StayArt seed={stay.slug} className="h-full w-full" />
            )}
          </div>
        </div>
      )}

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

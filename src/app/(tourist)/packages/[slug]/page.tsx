import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackage } from "@/server/catalog";
import { formatINR } from "@/lib/money";
import { env } from "@/server/env";
import PackageBooker from "@/components/catalog/PackageBooker";
import StayArt from "@/components/catalog/StayArt";
import Photo from "@/components/ui/Photo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pkg = await getPackage((await params).slug);
  if (!pkg) return { title: "Trip not found" };
  return {
    title: `${pkg.title}, ${formatINR(pkg.price)} fixed`,
    description: pkg.summary,
    alternates: { canonical: `/packages/${pkg.slug}` },
  };
}

export default async function PackagePage({ params }: Props) {
  const pkg = await getPackage((await params).slug);
  if (!pkg) notFound();
  const unit = pkg.priceUnit === "vehicle" ? "vehicle" : "person";

  const ld = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: pkg.title,
    description: pkg.summary,
    touristType: "Leisure",
    itinerary: pkg.itinerary.map((d) => ({ "@type": "TouristAttraction", name: d.title })),
    provider: pkg.operator ? { "@type": "TravelAgency", name: pkg.operator.name } : undefined,
    offers: {
      "@type": "Offer",
      price: (pkg.price / 100).toFixed(0),
      priceCurrency: "INR",
      url: `${env.siteUrl}/packages/${pkg.slug}`,
      availability: pkg.nextDate ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
        <Link href="/packages" className="hover:text-ink">Trips</Link> <span aria-hidden="true">/</span> {pkg.title}
      </nav>
      <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[24px] sm:aspect-[21/9]">
        <div data-parallax className="absolute inset-x-0 -bottom-[7%] -top-[7%]">
          {pkg.image ? (
            <Photo src={pkg.image.url} alt={pkg.image.alt} priority sizes="(max-width: 1200px) 100vw, 1152px" />
          ) : (
            <StayArt seed={pkg.slug} className="h-full w-full" />
          )}
        </div>
      </div>
      <div className="mt-10 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="kicker">{pkg.region}{pkg.permitType !== "none" ? ` · ${pkg.permitType} permit included` : ""}</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{pkg.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-2" style={{ maxWidth: "58ch" }}>{pkg.summary}</p>

          <section className="mt-12">
            <h2 className="font-display text-2xl font-extrabold">Day by day</h2>
            <ol className="mt-6 space-y-0 border-l-2 border-line pl-6">
              {pkg.itinerary.map((d) => (
                <li key={d.day} className="relative pb-8">
                  <span aria-hidden="true" className="absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-glacier bg-canvas" />
                  <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Day {d.day}</p>
                  <h3 className="mt-1 font-display text-lg font-extrabold">{d.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-ink-2" style={{ maxWidth: "60ch" }}>{d.detail}</p>
                </li>
              ))}
            </ol>
          </section>

          {pkg.stays.length > 0 && (
            <section className="mt-6">
              <h2 className="font-display text-2xl font-extrabold">Where you sleep</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {pkg.stays.map((s) => (
                  <li key={s.night}>
                    <Link href={`/stays/${s.slug}`} className="flex min-h-14 items-center justify-between rounded-2xl bg-panel px-4 py-3 hover:bg-panel-2">
                      <span><span className="block text-sm text-ink-2">Night {s.night + 1}, {s.town}</span>{s.name}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12 grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="font-display text-xl font-extrabold">Included</h2>
              <ul className="mt-3 space-y-2 text-ink-2">
                {pkg.inclusions.map((i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="text-ok">✓</span>{i}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold">Not included</h2>
              <ul className="mt-3 space-y-2 text-ink-2">
                {pkg.exclusions.map((i) => <li key={i} className="flex gap-2"><span aria-hidden="true">·</span>{i}</li>)}
              </ul>
            </div>
          </section>

          {pkg.operator && (
            <p className="mt-12 rounded-2xl bg-panel-2 p-5 text-sm leading-relaxed text-ink-2">
              This trip is run by <strong className="text-ink">{pkg.operator.name}</strong>
              {pkg.operator.licenceNo ? <>, Sikkim tourist trade registration <span className="font-mono">{pkg.operator.licenceNo}</span></> : null}.
              {pkg.permitType !== "none" && " They file your permit with the state using the IDs you upload after booking."}
            </p>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PackageBooker
            slug={pkg.slug}
            price={pkg.price}
            unit={unit}
            minGuests={pkg.minGuests}
            maxGuests={pkg.maxGuests}
            departures={pkg.departures}
          />
        </aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}

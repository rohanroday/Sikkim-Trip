import Link from "next/link";
import Hero from "@/components/home/Hero";
import TrustStrip from "@/components/home/TrustStrip";
import FareTicket from "@/components/catalog/FareTicket";
import StayCardView from "@/components/catalog/StayCardView";
import SearchBar from "@/components/catalog/SearchBar";
import { listLivePackages, listLiveStays, type PackageCard, type StayCard } from "@/server/catalog";
import { site } from "@/lib/site";
import { formatINR, rupeesToPaise } from "@/lib/money";
import { FAQ } from "@/lib/content";

export const dynamic = "force-dynamic";

async function loadHome(): Promise<{ packages: PackageCard[]; stays: StayCard[] }> {
  try {
    const [packages, stays] = await Promise.all([listLivePackages(), listLiveStays()]);
    return { packages, stays: stays.slice(0, 6) };
  } catch (err) {
    console.error("home: catalog unavailable", err);
    return { packages: [], stays: [] };
  }
}

const STEPS = [
  { n: "1", title: "Pick a trip and a date", body: "Every trip shows its full price, the stays you sleep in, and the seats left." },
  { n: "2", title: "Pay, and we hold your rooms", body: "Rooms are held for 10 minutes while you pay by UPI or card." },
  { n: "3", title: "Hosts confirm on WhatsApp", body: "Your homestay and operator confirm within hours. You get updates on WhatsApp." },
  { n: "4", title: "Add IDs, we sort the permit", body: "For Nathula or North Sikkim, upload IDs once. The operator files the permit." },
];

function SectionHead({ kicker, title, body, action }: { kicker: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="kicker">{kicker}</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.02em] sm:text-5xl" style={{ maxWidth: "20ch" }}>{title}</h2>
        {body && <p className="mt-3 text-lg text-ink-2" style={{ maxWidth: "54ch" }}>{body}</p>}
      </div>
      {action}
    </div>
  );
}

export default async function HomePage() {
  const { packages, stays } = await loadHome();
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <Hero image={site.heroImage} video={site.heroVideo} />

      <div data-hero-item className="relative z-10 mx-auto -mt-14 max-w-5xl px-4 sm:px-6">
        <SearchBar />
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <TrustStrip />
      </section>

      <section id="trips" className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32">
        <SectionHead
          kicker="Fixed-price trips"
          title="The price on the ticket is the price you pay."
          body="Stays, cab, driver, meals where listed, and the permit filing. One number, set before you travel."
          action={<Link href="/packages" className="btn btn-ghost">See every trip</Link>}
        />
        {packages.length ? (
          <div data-reveal-stagger className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.slice(0, 3).map((p) => (
              <FareTicket key={p.slug} pkg={p} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-2xl bg-panel p-6 text-ink-2">New trip dates are being added. Message us on WhatsApp and we will plan one with you.</p>
        )}
      </section>

      {stays.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32">
          <SectionHead
            kicker="Homestays with live rooms"
            title="Sleep in a family home."
            body="Small, family-run stays in Gangtok, Pelling and Lachung. The calendar shows the rooms that are really free."
            action={<Link href="/stays" className="btn btn-ghost">All homestays</Link>}
          />
          <div data-reveal-stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stays.map((s) => (
              <StayCardView key={s.slug} stay={s} />
            ))}
          </div>
        </section>
      )}

      <section id="how" className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32">
        <div className="rounded-[32px] bg-panel-2/70 p-6 sm:p-12">
          <SectionHead kicker="How it works" title="Four simple steps to Lachung." />
          <ol data-reveal-stagger className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display font-extrabold text-snow">{s.n}</span>
                <h3 className="mt-4 font-display text-lg font-extrabold">{s.title}</h3>
                <p className="mt-1.5 leading-relaxed text-ink-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32">
        <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div data-reveal>
            <p className="kicker">Why the price holds</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.02em] sm:text-5xl" style={{ maxWidth: "18ch" }}>
              Fares the state sets. Operators the state registers.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-2" style={{ maxWidth: "50ch" }}>
              Sikkim fixes some fares to stop overcharging, like the Gangtok to Nathula round trip. We use these as our base and publish the full
              price of every trip, so there is nothing to haggle over when you arrive.
            </p>
          </div>
          <div data-reveal className="ticket p-7 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="kicker">State-notified fare</p>
                <p className="mt-2 font-display text-2xl font-extrabold">Gangtok to Nathula</p>
              </div>
              <span data-stamp className="stamp text-xs">Fixed</span>
            </div>
            <p className="mt-6 font-display text-5xl font-extrabold tracking-tight">{formatINR(rupeesToPaise(6500))}</p>
            <p className="mt-2 text-sm text-ink-2">Round trip, normal class. {formatINR(rupeesToPaise(7000))} for luxury.</p>
            <div className="ticket-tear mt-7" aria-hidden="true" />
            <Link href="/packages/nathula-tsomgo-day-trip" className="mt-6 inline-flex font-semibold text-glacier underline-offset-4 hover:underline">
              See the Nathula day trip →
            </Link>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 pt-24 sm:px-6 sm:pt-32">
        <SectionHead kicker="Questions people ask" title="Before you book" />
        <div data-reveal className="mt-10 divide-y divide-line rounded-2xl border border-line/80 bg-panel">
          {FAQ.map((f) => (
            <details key={f.q} data-accordion className="group p-5 sm:p-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden="true" className="text-xl text-ink-2 transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32">
        <div data-reveal className="flex flex-col items-start gap-6 rounded-[32px] bg-ink p-8 text-snow sm:p-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ maxWidth: "20ch" }}>
              Pick your dates. We hold them while you pay.
            </h2>
            <p className="mt-3 text-snow/75">Peak weeks in Lachung fill early. Book before the rooms go.</p>
          </div>
          <Link href="/packages" className="btn btn-primary shrink-0">Book a trip</Link>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </>
  );
}

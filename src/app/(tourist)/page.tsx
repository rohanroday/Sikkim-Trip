import Link from "next/link";
import Hero from "@/components/home/Hero";
import FareTicket from "@/components/catalog/FareTicket";
import HoldToStamp from "@/components/home/HoldToStamp";
import Reveal from "@/components/ui/Reveal";
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
  { n: "01", title: "Pick a trip and a date", body: "Every trip shows its full price, the stays you sleep in, and the seats left. What you see is what you pay." },
  { n: "02", title: "Pay, and we hold your rooms", body: "Your rooms are held for 10 minutes while you pay by UPI or card. Nobody else can take them in that time." },
  { n: "03", title: "Hosts confirm on WhatsApp", body: "Your homestay and your registered operator confirm within hours. You get updates on WhatsApp, not phone tag." },
  { n: "04", title: "Add IDs, we sort the permit", body: "For Nathula or North Sikkim, upload each guest's ID once. The operator files the permit. IDs are deleted 7 days after you return." },
];

export default async function HomePage() {
  const { packages, stays } = await loadHome();
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <Hero videoUrl={site.heroVideo} />

      <div className="relative z-10 mx-auto -mt-16 max-w-6xl px-4 sm:px-6">
        <SearchBar />
      </div>

      {/* Fare tickets: the signature */}
      <section id="trips" className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <Reveal>
          <p className="kicker part">Fixed-price trips</p>
          <h2 className="part mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ maxWidth: "18ch" }}>
            The price on the ticket is the price you pay.
          </h2>
          <p className="part mt-4 text-lg text-ink-2" style={{ maxWidth: "52ch" }}>
            Stays, cab, driver, meals where listed, and the permit filing. One number, set before you travel.
          </p>
        </Reveal>
        {packages.length ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.slice(0, 3).map((p, i) => (
              <FareTicket key={p.slug} pkg={p} className={i === 1 ? "lg:translate-y-6" : ""} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-2xl bg-panel p-6 text-ink-2">New trip dates are being added. Message us on WhatsApp and we will plan one with you.</p>
        )}
        <div className="mt-12">
          <Link href="/packages" className="btn btn-ghost">See every trip</Link>
        </div>
      </section>

      {/* How it works: a road with four stops */}
      <section id="how" className="mt-28 bg-ink py-24 text-snow">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div className="part">
              <p className="kicker !text-snow/60">How it works</p>
              <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight" style={{ maxWidth: "12ch" }}>
                Four stops from your sofa to Lachung.
              </h2>
            </div>
            <ol className="relative grid gap-8 sm:grid-cols-2">
              {STEPS.map((s) => (
                <li key={s.n} className="part relative rounded-2xl border border-snow/15 bg-snow/[0.04] p-6">
                  <span className="font-mono text-sm text-[#f2b8c2]">{s.n}</span>
                  <h3 className="mt-2 font-display text-xl font-extrabold">{s.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-snow/75">{s.body}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Trust + the interactive moment */}
      <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="kicker part">Why the price holds</p>
            <h2 className="part mt-3 font-display text-4xl font-extrabold tracking-tight" style={{ maxWidth: "16ch" }}>
              Fares the state sets. Operators the state registers.
            </h2>
            <ul className="part mt-6 space-y-4 text-[1.02rem] leading-relaxed text-ink-2">
              <li><strong className="text-ink">Government fares are our base.</strong> Where Sikkim fixes a fare, like Gangtok to Nathula, our price starts from it.</li>
              <li><strong className="text-ink">Registered operators only.</strong> Permit trips run with a Sikkim-registered operator and a Sikkimese driver, as the law asks.</li>
              <li><strong className="text-ink">Live rooms, not promises.</strong> The calendar shows rooms that are actually free, so you never reach Lachung to find it full.</li>
            </ul>
          </Reveal>
          <HoldToStamp fare={formatINR(rupeesToPaise(6500))} route="Gangtok to Nathula" />
        </div>
      </section>

      {stays.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker">Homestays with live rooms</p>
              <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight">Sleep in a family home.</h2>
            </div>
            <Link href="/stays" className="btn btn-ghost">All homestays</Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stays.map((s) => (
              <StayCardView key={s.slug} stay={s} />
            ))}
          </div>
        </section>
      )}

      <section id="faq" className="mx-auto max-w-3xl px-4 pt-28 sm:px-6">
        <p className="kicker">Questions people ask</p>
        <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight">Before you book</h2>
        <div className="mt-8 divide-y divide-line rounded-2xl bg-panel">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5 sm:p-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden="true" className="text-xl text-ink-2 transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
        <div className="ticket flex flex-col items-start gap-6 p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ maxWidth: "20ch" }}>
              Pick your dates. We hold them while you pay.
            </h2>
            <p className="mt-3 text-ink-2">Peak weeks in Lachung fill early. Book before the rooms go.</p>
          </div>
          <Link href="/packages" className="btn btn-primary shrink-0">Book a trip</Link>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </>
  );
}

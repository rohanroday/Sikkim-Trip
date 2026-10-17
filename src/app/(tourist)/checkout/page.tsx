import type { Metadata } from "next";
import Link from "next/link";
import { quoteFromParams } from "@/server/booking/quote";
import { getSession } from "@/server/auth/session";
import { formatINR } from "@/lib/money";
import CheckoutForm from "@/components/booking/CheckoutForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book your trip", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function CheckoutPage({ searchParams }: Props) {
  const [quote, session] = await Promise.all([quoteFromParams(await searchParams), getSession()]);

  if (!quote) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-32 text-center sm:px-6">
        <h1 className="font-display text-3xl font-extrabold">Those dates are no longer open</h1>
        <p className="mt-3 text-ink-2">Please go back and pick again.</p>
        <Link href="/packages" className="btn btn-primary mt-6">See trips</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 pt-28 sm:px-6 sm:pt-32 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <p className="kicker">Book</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Your details</h1>
        <p className="mt-3 text-ink-2">We send booking updates on WhatsApp to this number.</p>
        <div className="mt-8">
          <CheckoutForm
            request={quote.request}
            total={quote.total}
            signedInPhone={session?.role === "tourist" ? session.phone : null}
            razorpayKey={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ""}
          />
        </div>
      </div>
      <aside className="ticket h-fit p-6 lg:sticky lg:top-6">
        <p className="kicker">{quote.kind === "package" ? "Trip" : "Stay"}</p>
        <h2 className="mt-1 font-display text-xl font-extrabold">{quote.title}</h2>
        <p className="mt-1 text-sm text-ink-2">{quote.dateLabel} · {quote.guests} guest{quote.guests > 1 ? "s" : ""}</p>
        <ul className="mt-5 space-y-2 text-sm">
          {quote.lines.map((l) => (
            <li key={l.label} className="flex justify-between gap-4">
              <span className="text-ink-2">{l.label}</span>
              <span>{formatINR(l.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="ticket-tear mt-5" aria-hidden="true" />
        <div className="mt-5 flex items-baseline justify-between">
          <span className="font-semibold">Total, taxes included</span>
          <span className="font-display text-2xl font-extrabold">{formatINR(quote.total)}</span>
        </div>
        {quote.permitType !== "none" && (
          <p className="mt-4 rounded-xl bg-panel-2 p-3 text-sm text-ink-2">
            This trip needs a {quote.permitType} permit. After paying, you add each guest&apos;s ID and the operator files it.
          </p>
        )}
      </aside>
    </div>
  );
}

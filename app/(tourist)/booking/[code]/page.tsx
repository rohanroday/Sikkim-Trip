import type { Metadata } from "next";
import Link from "next/link";
import { bookingForToken } from "@/lib/booking/access";
import { cancellationQuote } from "@/lib/booking/cancel";
import { PermitRequest, type PermitRequestDoc, type BookingStatus } from "@/lib/db/models";
import { formatINR } from "@/lib/money";
import { diffDays, formatNight, todayIST } from "@/lib/dates";
import { whatsappLink } from "@/lib/site";
import { NotFoundError } from "@/lib/errors";
import GuestForm from "@/components/booking/GuestForm";
import CancelBooking from "@/components/booking/CancelBooking";
import AutoRefresh from "@/components/ui/AutoRefresh";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ t?: string }> };

const STATUS_COPY: Record<BookingStatus, { title: string; body: string }> = {
  held: { title: "Waiting for your payment", body: "Your rooms are held for 10 minutes. If you have paid, this page updates in a few seconds." },
  paid: { title: "Paid. Hosts are confirming", body: "We have your payment. Your hosts confirm on WhatsApp, usually within 2 hours." },
  confirmed: { title: "Confirmed", body: "Everyone has confirmed. You are all set." },
  completed: { title: "Trip complete", body: "Thank you for travelling with us." },
  expired: { title: "Hold expired", body: "The 10 minutes ran out before payment came through, so the rooms went back on sale. If money left your account, it is refunded automatically." },
  cancelled: { title: "Cancelled", body: "Your refund is on its way. It usually takes 5 to 7 working days." },
  refunded: { title: "Refunded", body: "Your refund has been sent." },
};

const STEPS: BookingStatus[] = ["held", "paid", "confirmed", "completed"];

export default async function BookingPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { t } = await searchParams;
  let booking;
  try {
    booking = await bookingForToken(code, t);
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
    return (
      <div className="mx-auto max-w-xl px-4 pt-32 text-center sm:px-6">
        <h1 className="font-display text-3xl font-extrabold">We could not find that booking</h1>
        <p className="mt-3 text-ink-2">Open the link from your WhatsApp message, or message us with your booking code.</p>
        <a href={whatsappLink(`Hi, I need help with booking ${code}`)} className="btn btn-primary mt-6">Message us</a>
      </div>
    );
  }

  const status = booking.status as BookingStatus;
  const copy = STATUS_COPY[status];
  const permit = booking.permitRequired ? await PermitRequest.findOne({ bookingId: booking._id }).lean<PermitRequestDoc>() : null;
  const quote = cancellationQuote(booking);
  const stepIndex = STEPS.indexOf(status);
  const confirmations = booking.partnerConfirmations ?? [];
  const confirmedCount = confirmations.filter((c) => c.status === "confirmed").length;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-28 sm:px-6 sm:pt-32">
      {(status === "held" || status === "paid") && <AutoRefresh seconds={status === "held" ? 4 : 30} />}
      <p className="kicker">Booking <span className="font-mono">{booking.code}</span></p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">{copy.title}</h1>
      <p className="mt-3 text-lg text-ink-2" style={{ maxWidth: "56ch" }}>{copy.body}</p>

      {stepIndex >= 0 && (
        <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Booking progress">
          {STEPS.map((s, i) => (
            <li key={s} className="text-center">
              <span aria-hidden="true" className={`block h-1.5 rounded-full ${i <= stepIndex ? "bg-ok" : "bg-line"}`} />
              <span className={`mt-2 block text-xs ${i <= stepIndex ? "font-semibold text-ink" : "text-ink-2"}`}>
                {["Held", "Paid", "Confirmed", "Done"][i]}
              </span>
            </li>
          ))}
        </ol>
      )}

      <section className="ticket mt-10 p-6">
        <h2 className="font-display text-xl font-extrabold">{booking.items[0]?.label}</h2>
        <p className="mt-1 text-ink-2">
          {booking.kind === "stay" ? `${formatNight(booking.startDate)} to ${formatNight(booking.endDate)}` : `Starts ${formatNight(booking.startDate)}`} ·{" "}
          {booking.guests} guest{booking.guests > 1 ? "s" : ""}
        </p>
        {booking.items.length > 1 && (
          <ul className="mt-4 space-y-1 text-sm text-ink-2">
            {booking.items.slice(1).map((i) => (
              <li key={String(i._id)}>Stay: {i.label}, {i.nights.length} night{i.nights.length > 1 ? "s" : ""} from {formatNight(i.nights[0])}</li>
            ))}
          </ul>
        )}
        <div className="ticket-tear mt-5" aria-hidden="true" />
        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-ink-2">Paid total</span>
          <span className="font-display text-2xl font-extrabold">{formatINR(booking.amount)}</span>
        </div>
        {status === "paid" && confirmations.length > 0 && (
          <p className="mt-3 text-sm text-ink-2">{confirmedCount} of {confirmations.length} hosts confirmed.</p>
        )}
        {booking.refund?.amount != null && (
          <p className="mt-3 text-sm text-ink-2">Refund: {formatINR(booking.refund.amount)}.</p>
        )}
      </section>

      {permit && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-extrabold">{permit.permitType} permit</h2>
          {permit.status === "pending_docs" || permit.status === "ready" ? (
            <>
              <p className="mt-2 text-ink-2" style={{ maxWidth: "60ch" }}>
                {permit.status === "ready"
                  ? "We have every guest's ID. You can still replace them until we send them to the operator."
                  : diffDays(todayIST(), permit.travelDate) <= 3
                    ? `Add ID details for all ${permit.guestsExpected} guests today. Your trip is close and the operator needs time to file.`
                    : `Add ID details for all ${permit.guestsExpected} guests. The operator needs them at least 3 days before ${formatNight(permit.travelDate)}.`}
              </p>
              <div className="mt-6">
                <GuestForm code={booking.code} token={t ?? ""} count={permit.guestsExpected} />
              </div>
            </>
          ) : (
            <p className="mt-2 rounded-2xl bg-panel p-5 text-ink-2">
              {permit.docsPurgedAt
                ? "Your trip is over and the IDs have been deleted."
                : {
                    sent: "Your guest list is with the operator. They file it with the state.",
                    filed: "The operator has filed your permit. We will message you when it is approved.",
                    approved: "Permit approved. Carry the same IDs you uploaded.",
                    rejected: "The permit was not approved. We will call you about next steps.",
                  }[permit.status as "sent" | "filed" | "approved" | "rejected"]}
            </p>
          )}
        </section>
      )}

      <section className="mt-12 flex flex-wrap gap-3">
        <a href={whatsappLink(`Hi, I have a question about booking ${booking.code}`)} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
          Message us on WhatsApp
        </a>
        {quote && <CancelBooking code={booking.code} token={t ?? ""} refund={quote.refund} refundPct={quote.refundPct} />}
      </section>
      <p className="mt-8 text-sm text-ink-2">
        Keep this link private. Anyone with it can see this booking. <Link href="/cancellation-policy" className="underline">Cancellation policy</Link>
      </p>
    </div>
  );
}

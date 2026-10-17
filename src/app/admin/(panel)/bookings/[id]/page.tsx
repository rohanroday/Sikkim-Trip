import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/server/db/connect";
import { AuditLog, Booking, Message, Partner, type BookingDoc, type PartnerDoc } from "@/server/db/models";
import { formatINR } from "@/lib/money";
import { formatNight } from "@/lib/dates";
import { cancellationQuote } from "@/server/booking/cancel";
import { Badge, Flash, PageTitle, Panel, Table } from "@/components/admin/ui";
import { adminCancelAction, partnerResponseAction } from "../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> };

export default async function AdminBooking({ params, searchParams }: Props) {
  const { id } = await params;
  const { m } = await searchParams;
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();
  await connectDB();
  const b = await Booking.findById(id).lean<BookingDoc>();
  if (!b) notFound();
  const partners = await Partner.find({ _id: { $in: b.items.map((i) => i.partnerId) } }).lean<PartnerDoc[]>();
  const pBy = new Map(partners.map((p) => [String(p._id), p]));
  const [logs, messages] = await Promise.all([
    AuditLog.find({ entity: "booking", entityId: id }).sort({ at: -1 }).limit(50).lean(),
    Message.find({ bookingId: b._id }).sort({ createdAt: -1 }).limit(30).lean(),
  ]);
  const quote = cancellationQuote(b);

  return (
    <>
      <Link href="/admin/bookings" className="text-sm text-ink-2 underline">All bookings</Link>
      <PageTitle title={b.code} sub={`${b.tourist.name} · ${b.tourist.phone}${b.tourist.email ? ` · ${b.tourist.email}` : ""}`} />
      <Flash m={m} />
      {b.flagged && <p className="mb-6 rounded-xl border-2 border-accent p-3 text-sm"><strong>Flag:</strong> {b.flagged}</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Booking">
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
            <dt className="text-ink-2">Status</dt><dd><Badge value={b.status} /></dd>
            <dt className="text-ink-2">Dates</dt><dd>{formatNight(b.startDate)} to {formatNight(b.endDate)}</dd>
            <dt className="text-ink-2">Guests</dt><dd>{b.guests}</dd>
            <dt className="text-ink-2">Amount</dt><dd>{formatINR(b.amount)} (commission {formatINR(b.commission)})</dd>
            <dt className="text-ink-2">Payment</dt><dd className="font-mono text-xs">{b.razorpayPaymentId ?? "none"} / {b.razorpayOrderId ?? "no order"}</dd>
            {b.refund?.amount != null && (<><dt className="text-ink-2">Refund</dt><dd>{formatINR(b.refund.amount)} · {b.refund.status}</dd></>)}
          </dl>
          <h3 className="mt-5 text-sm font-semibold">Items</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {b.items.map((i) => (
              <li key={String(i._id)} className="rounded-xl bg-snow p-3">
                <strong>{i.label}</strong> · {pBy.get(String(i.partnerId))?.name}
                <br />
                <span className="text-ink-2">
                  {i.nights?.length ? `${i.nights.length} nights from ${formatNight(i.nights[0], { weekday: false })} · ` : ""}
                  partner share {formatINR(i.amount)}, commission {formatINR(i.commission)}, payout {formatINR(i.amount - i.commission)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Partner confirmations">
          {(b.partnerConfirmations ?? []).length === 0 && <p className="text-sm text-ink-2">Asked after payment.</p>}
          <ul className="space-y-3">
            {(b.partnerConfirmations ?? []).map((c) => {
              const p = pBy.get(String(c.partnerId));
              return (
                <li key={String(c.partnerId)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-snow p-3 text-sm">
                  <span>
                    <strong>{p?.name}</strong> <span className="font-mono text-xs text-ink-2">{p?.whatsapp}</span>
                    <br />
                    <Badge value={c.status ?? "pending"} /> {c.escalatedAt && <span className="text-xs text-accent">escalated</span>}
                  </span>
                  {c.status === "pending" && b.status === "paid" && (
                    <form action={partnerResponseAction} className="flex gap-2">
                      <input type="hidden" name="bookingId" value={id} />
                      <input type="hidden" name="partnerId" value={String(c.partnerId)} />
                      <button name="response" value="confirm" className="btn btn-ghost min-h-10 px-3 text-sm">Confirm for them</button>
                      <button name="response" value="decline" className="btn btn-ghost min-h-10 px-3 text-sm">Decline</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>

        {quote && (
          <Panel title="Cancel and refund">
            <form action={adminCancelAction} className="space-y-3 text-sm">
              <input type="hidden" name="bookingId" value={id} />
              <p>Policy refund now: <strong>{formatINR(quote.refund)}</strong> ({quote.refundPct}%).</p>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="forceFull" className="h-5 w-5" /> Full refund (route closed, partner failed, or goodwill)
              </label>
              <input name="reason" required placeholder="Reason (shown in audit log)" className="field" />
              <button className="btn btn-primary">Cancel booking</button>
            </form>
          </Panel>
        )}

        <Panel title="Messages sent">
          <ul className="space-y-1 text-sm">
            {messages.map((msg) => (
              <li key={String(msg._id)} className="flex justify-between gap-2">
                <span className="font-mono text-xs">{msg.template}</span>
                <span className="text-ink-2">{msg.status}{msg.error ? `: ${msg.error}` : ""}</span>
              </li>
            ))}
            {messages.length === 0 && <li className="text-ink-2">None yet.</li>}
          </ul>
        </Panel>
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl font-extrabold">History</h2>
      <Table head={["When", "Who", "What"]}>
        {logs.map((l) => (
          <tr key={String(l._id)}>
            <td className="whitespace-nowrap">{new Date(l.at!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
            <td className="font-mono text-xs">{l.actor}</td>
            <td>{l.action}{(l.after as { note?: string })?.note ? `: ${(l.after as { note?: string }).note}` : ""}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

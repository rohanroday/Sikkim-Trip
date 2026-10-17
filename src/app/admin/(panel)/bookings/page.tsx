import Link from "next/link";
import { connectDB } from "@/server/db/connect";
import { Booking, BOOKING_STATUSES, type BookingDoc } from "@/server/db/models";
import { formatINR } from "@/lib/money";
import { formatNight } from "@/lib/dates";
import { maskPhone, normalizePhone } from "@/lib/phone";
import { Badge, PageTitle, Table } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ status?: string; q?: string }> };

export default async function AdminBookings({ searchParams }: Props) {
  const { status, q } = await searchParams;
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (status && (BOOKING_STATUSES as readonly string[]).includes(status)) filter.status = status;
  if (q) {
    const phone = normalizePhone(q);
    filter.$or = [{ code: q.trim().toUpperCase() }, ...(phone ? [{ "tourist.phone": phone }] : [])];
  }
  const bookings = await Booking.find(filter).sort({ createdAt: -1 }).limit(100).lean<BookingDoc[]>();

  return (
    <>
      <PageTitle title="Bookings" sub="Latest 100. Search by booking code or phone." />
      <form className="mb-5 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="SK-XXXXXX or phone" className="field max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="field max-w-[180px]">
          <option value="">All statuses</option>
          {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-ghost">Filter</button>
      </form>
      <Table head={["Code", "Trip / stay", "Dates", "Tourist", "Amount", "Status"]}>
        {bookings.map((b) => (
          <tr key={String(b._id)}>
            <td><Link href={`/admin/bookings/${b._id}`} className="font-mono underline">{b.code}</Link>{b.flagged && <span className="ml-1 text-accent" title={b.flagged}>●</span>}</td>
            <td>{b.items[0]?.label}</td>
            <td className="whitespace-nowrap">{formatNight(b.startDate, { weekday: false })}</td>
            <td>{b.tourist.name}<br /><span className="font-mono text-xs text-ink-2">{maskPhone(b.tourist.phone)}</span></td>
            <td>{formatINR(b.amount)}</td>
            <td><Badge value={b.status} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}

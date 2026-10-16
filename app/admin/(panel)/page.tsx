import Link from "next/link";
import { connectDB } from "@/lib/db/connect";
import { Booking, PermitRequest, Partner, type BookingDoc } from "@/lib/db/models";
import { formatINR } from "@/lib/money";
import { formatNight, todayIST, addDays } from "@/lib/dates";
import { Badge, PageTitle, Panel, Table } from "@/components/admin/ui";

export default async function AdminHome() {
  await connectDB();
  const today = todayIST();
  const monthStart = today.slice(0, 8) + "01";
  const [flagged, awaitingPartners, permitsReady, pendingPartners, upcoming, monthAgg] = await Promise.all([
    Booking.find({ flagged: { $exists: true, $ne: null } }).sort({ updatedAt: -1 }).limit(10).lean<BookingDoc[]>(),
    Booking.countDocuments({ status: "paid" }),
    PermitRequest.countDocuments({ status: { $in: ["ready", "pending_docs"] } }),
    Partner.countDocuments({ verificationStatus: "pending" }),
    Booking.find({ status: { $in: ["paid", "confirmed"] }, startDate: { $gte: today, $lte: addDays(today, 7) } }).sort({ startDate: 1 }).limit(20).lean<BookingDoc[]>(),
    Booking.aggregate<{ gbv: number; commission: number; n: number }>([
      { $match: { status: { $in: ["paid", "confirmed", "completed"] }, startDate: { $gte: monthStart } } },
      { $group: { _id: null, gbv: { $sum: "$amount" }, commission: { $sum: "$commission" }, n: { $sum: 1 } } },
    ]),
  ]);
  const m = monthAgg[0] ?? { gbv: 0, commission: 0, n: 0 };

  const stats = [
    ["Trips this month", String(m.n)],
    ["Booking value", formatINR(m.gbv)],
    ["Commission", formatINR(m.commission)],
    ["Waiting on partners", String(awaitingPartners)],
    ["Permits to handle", String(permitsReady)],
    ["Partners to verify", String(pendingPartners)],
  ];

  return (
    <>
      <PageTitle title="Overview" sub={`Today is ${formatNight(today)}.`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-panel p-4 shadow-sm">
            <p className="text-xs text-ink-2">{k}</p>
            <p className="mt-1 font-display text-2xl font-extrabold">{v}</p>
          </div>
        ))}
      </div>

      {flagged.length > 0 && (
        <Panel title="Needs a human" className="mt-8 border-2 border-accent">
          <ul className="space-y-2 text-sm">
            {flagged.map((b) => (
              <li key={String(b._id)}>
                <Link href={`/admin/bookings/${b._id}`} className="font-mono underline">{b.code}</Link>: {b.flagged}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <h2 className="mb-3 mt-10 font-display text-xl font-extrabold">Next 7 days</h2>
      <Table head={["Code", "Trip", "Starts", "Guests", "Status"]}>
        {upcoming.map((b) => (
          <tr key={String(b._id)}>
            <td><Link href={`/admin/bookings/${b._id}`} className="font-mono underline">{b.code}</Link></td>
            <td>{b.items[0]?.label}</td>
            <td>{formatNight(b.startDate)}</td>
            <td>{b.guests}</td>
            <td><Badge value={b.status} /></td>
          </tr>
        ))}
        {upcoming.length === 0 && <tr><td colSpan={5} className="text-ink-2">No trips in the next week.</td></tr>}
      </Table>
    </>
  );
}

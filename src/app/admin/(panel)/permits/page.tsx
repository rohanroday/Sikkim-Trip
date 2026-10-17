import Link from "next/link";
import { connectDB } from "@/server/db/connect";
import { Booking, Partner, PermitRequest, type BookingDoc, type PartnerDoc, type PermitRequestDoc } from "@/server/db/models";
import { formatNight, todayIST, addDays } from "@/lib/dates";
import { signedUrl } from "@/server/storage/storage";
import { Badge, Flash, PageTitle, Panel } from "@/components/admin/ui";
import { permitStatusAction, sendPermitAction } from "../actions";

/** A-06: guest lists and IDs for operators. ID links expire in 5 minutes. */
export default async function AdminPermits({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  await connectDB();
  const permits = await PermitRequest.find({ docsPurgedAt: null, travelDate: { $gte: addDays(todayIST(), -1) } })
    .sort({ travelDate: 1 })
    .limit(50)
    .lean<PermitRequestDoc[]>();
  const [bookings, operators] = await Promise.all([
    Booking.find({ _id: { $in: permits.map((p) => p.bookingId) } }).lean<BookingDoc[]>(),
    Partner.find({ _id: { $in: permits.map((p) => p.operatorId) } }).lean<PartnerDoc[]>(),
  ]);
  const bBy = new Map(bookings.map((b) => [String(b._id), b]));
  const oBy = new Map(operators.map((o) => [String(o._id), o]));
  const withUrls = await Promise.all(
    permits.map(async (p) => ({
      p,
      urls: await Promise.all((p.guests ?? []).map((g) => (g.idFileKey ? signedUrl(g.idFileKey) : Promise.resolve("")))),
    })),
  );

  return (
    <>
      <PageTitle title="Permits" sub="Collect IDs, send to the operator, track filing. IDs auto-delete 7 days after each trip." />
      <Flash m={m} />
      <div className="space-y-5">
        {withUrls.map(({ p, urls }) => {
          const b = bBy.get(String(p.bookingId));
          const op = oBy.get(String(p.operatorId));
          return (
            <Panel key={String(p._id)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-extrabold">
                    {p.permitType} · {formatNight(p.travelDate)} · {b ? <Link href={`/admin/bookings/${b._id}`} className="font-mono underline">{b.code}</Link> : "?"}
                  </p>
                  <p className="text-sm text-ink-2">Operator: {op?.name} ({op?.whatsapp}) · {p.guests?.length ?? 0} of {p.guestsExpected} guests</p>
                </div>
                <Badge value={p.status ?? "pending_docs"} />
              </div>
              {(p.guests?.length ?? 0) > 0 && (
                <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  {p.guests!.map((g, i) => (
                    <li key={i} className="rounded-xl bg-snow p-3">
                      <strong>{g.name}</strong>, {g.age}, {g.gender}, {g.nationality}{g.isForeign && <span className="ml-1 text-warn">(foreign: PAP)</span>}
                      <br />
                      <span className="text-ink-2">{g.idType} ending {g.idNumberMasked}</span>{" "}
                      {urls[i] && <a href={urls[i]} target="_blank" rel="noopener noreferrer" className="underline">View ID</a>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {p.status === "ready" && (
                  <form action={sendPermitAction}>
                    <input type="hidden" name="id" value={String(p._id)} />
                    <button className="btn btn-primary min-h-10 text-sm">Send to operator</button>
                  </form>
                )}
                {["sent", "filed"].includes(p.status ?? "") && (
                  <form action={permitStatusAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={String(p._id)} />
                    <input name="note" placeholder="Note (optional)" className="field min-h-10 max-w-xs py-1" />
                    {p.status === "sent" && <button name="status" value="filed" className="btn btn-ghost min-h-10 text-sm">Mark filed</button>}
                    <button name="status" value="approved" className="btn btn-ghost min-h-10 text-sm">Approved</button>
                    <button name="status" value="rejected" className="btn btn-ghost min-h-10 text-sm">Rejected</button>
                  </form>
                )}
              </div>
            </Panel>
          );
        })}
        {permits.length === 0 && <p className="text-ink-2">No upcoming permit trips.</p>}
      </div>
    </>
  );
}

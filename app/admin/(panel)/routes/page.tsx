import { connectDB } from "@/lib/db/connect";
import { ROUTES, RouteStatus, type RouteStatusDoc } from "@/lib/db/models";
import { formatNight, todayIST, addDays } from "@/lib/dates";
import { ROUTE_LABELS } from "@/lib/routes";
import { affectedBookings } from "@/lib/admin/routesAdmin";
import { Field, Flash, PageTitle, Panel, Select, Table } from "@/components/admin/ui";
import { createClosureAction, endClosureAction, notifyAffectedAction } from "../actions";

export default async function AdminRoutes({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  await connectDB();
  const today = todayIST();
  const closures = await RouteStatus.find({ active: true }).sort({ from: 1 }).lean<RouteStatusDoc[]>();
  const counts = await Promise.all(closures.map((c) => affectedBookings(c).then((b) => b.length)));

  return (
    <>
      <PageTitle title="Route closures" sub="A closed route hides its departures, blocks new bookings and shows a banner on every page." />
      <Flash m={m} />
      <Table head={["Route", "Status", "Dates", "Note", "Affected bookings", ""]}>
        {closures.map((c, i) => (
          <tr key={String(c._id)}>
            <td>{ROUTE_LABELS[c.route as keyof typeof ROUTE_LABELS] ?? c.route}</td>
            <td>{c.status}</td>
            <td className="whitespace-nowrap">{formatNight(c.from, { weekday: false })} to {formatNight(c.to, { weekday: false })}</td>
            <td>{c.note}</td>
            <td>{counts[i]}</td>
            <td className="flex gap-1">
              {counts[i] > 0 && (
                <form action={notifyAffectedAction}>
                  <input type="hidden" name="id" value={String(c._id)} />
                  <button className="btn btn-ghost min-h-9 px-3 text-xs">Notify travellers</button>
                </form>
              )}
              <form action={endClosureAction}>
                <input type="hidden" name="id" value={String(c._id)} />
                <button className="btn btn-ghost min-h-9 px-3 text-xs">Reopen</button>
              </form>
            </td>
          </tr>
        ))}
        {closures.length === 0 && <tr><td colSpan={6} className="text-ink-2">All routes open.</td></tr>}
      </Table>

      <Panel title="Close a route" className="mt-8 max-w-2xl">
        <form action={createClosureAction} className="grid gap-4 sm:grid-cols-2">
          <Select label="Route" name="route" options={ROUTES.map((r) => [r, ROUTE_LABELS[r]] as const)} />
          <Select label="Status" name="status" options={[["closed", "Closed (blocks sales)"], ["restricted", "Restricted (banner only)"]]} />
          <Field label="From" name="from" type="date" required defaultValue={today} />
          <Field label="To" name="to" type="date" required defaultValue={addDays(today, 7)} />
          <div className="sm:col-span-2"><Field label="Note for travellers" name="note" placeholder="Landslide near Chungthang." /></div>
          <div className="sm:col-span-2"><button className="btn btn-primary">Save closure</button></div>
        </form>
      </Panel>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db/connect";
import { Inventory, Property, Room, type PropertyDoc, type RoomDoc } from "@/lib/db/models";
import { addDays, todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { Badge, Field, Flash, PageTitle, Panel, Select } from "@/components/admin/ui";
import { addRoomAction, inventoryAction, setPropertyStatusAction } from "../../actions";

const DAYS = 30;
const LETTER: Record<string, string> = { available: "A", held: "H", booked: "B", blocked: "X" };
const CELL: Record<string, string> = {
  available: "bg-[#e3f1e8] text-ok",
  held: "bg-[#fff3d6] text-warn",
  booked: "bg-glacier text-snow",
  blocked: "bg-ink-2 text-snow",
};

export default async function AdminStay({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  const { id } = await params;
  const { m } = await searchParams;
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();
  await connectDB();
  const p = await Property.findById(id).lean<PropertyDoc>();
  if (!p) notFound();
  const today = todayIST();
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i));
  const rooms = await Room.find({ propertyId: p._id, active: true }).lean<RoomDoc[]>();
  const inv = await Inventory.find({ propertyId: p._id, date: { $gte: today, $lt: addDays(today, DAYS) } }).lean();
  const invBy = new Map(inv.map((i) => [`${i.roomId}|${i.date}`, i]));

  return (
    <>
      <Link href="/admin/stays" className="text-sm text-ink-2 underline">All stays</Link>
      <PageTitle title={p.name} sub={`${p.town} · ${p.type}`} />
      <Flash m={m} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge value={p.status ?? "draft"} />
        <form action={setPropertyStatusAction} className="flex gap-2">
          <input type="hidden" name="id" value={id} />
          {p.status !== "live" && <button name="status" value="live" className="btn btn-primary min-h-10 text-sm">Set live</button>}
          {p.status === "live" && <button name="status" value="paused" className="btn btn-ghost min-h-10 text-sm">Pause</button>}
        </form>
        {p.status === "live" && <Link href={`/stays/${p.slug}`} className="text-sm underline">View public page</Link>}
      </div>

      <Panel title={`Next ${DAYS} nights`}>
        {rooms.length === 0 && <p className="text-sm text-ink-2">No rooms yet.</p>}
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="pr-3 text-left font-medium">Room</th>
                {days.map((d) => <th key={d} className="w-9 px-0.5 font-mono font-normal text-ink-2">{d.slice(8)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={String(r._id)}>
                  <td className="whitespace-nowrap py-1 pr-3">{r.name} ({r.capacity})</td>
                  {days.map((d) => {
                    const cell = invBy.get(`${r._id}|${d}`);
                    return (
                      <td key={d} className="px-0.5 py-1">
                        <span title={cell ? `${cell.status} ${formatINR(cell.price)}` : "not open"} className={`block h-7 w-8 rounded text-center leading-7 ${cell ? CELL[cell.status] : "bg-panel-2 text-ink-2/50"}`}>
                          {cell ? LETTER[cell.status] : "·"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">A available · H held · B booked · X blocked · dot not open yet</p>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Open, block or unblock nights">
          <form action={inventoryAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="propertyId" value={id} />
            <Select label="Room" name="roomId" options={rooms.map((r) => [String(r._id), r.name] as const)} />
            <Select label="Action" name="action" options={[["open", "Open for sale / set price"], ["block", "Block (owner use, OTA booking)"], ["unblock", "Unblock"]]} />
            <Field label="From" name="from" type="date" required defaultValue={today} />
            <Field label="To (inclusive)" name="to" type="date" required defaultValue={addDays(today, 60)} />
            <Field label="Price per night (₹)" name="priceRupees" type="number" hint="Blank uses the room's base price." />
            <div className="flex items-end"><button className="btn btn-primary w-full">Apply</button></div>
          </form>
          <p className="hint mt-3">Held and booked nights are never changed here.</p>
        </Panel>

        <Panel title="Add a room">
          <form action={addRoomAction} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="propertyId" value={id} />
            <Field label="Room name" name="name" required placeholder="Valley view" />
            <Field label="Sleeps" name="capacity" type="number" required defaultValue={2} />
            <Field label="Base price (₹)" name="priceRupees" type="number" required defaultValue={2500} />
            <div className="sm:col-span-3"><button className="btn btn-ghost">Add room</button></div>
          </form>
        </Panel>
      </div>
    </>
  );
}

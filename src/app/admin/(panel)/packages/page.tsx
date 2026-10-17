import Link from "next/link";
import { connectDB } from "@/server/db/connect";
import { Departure, Package, Partner, Property, ROUTES, type PackageDoc, type PartnerDoc, type PropertyDoc } from "@/server/db/models";
import { formatINR } from "@/lib/money";
import { addDays, todayIST } from "@/lib/dates";
import { Area, Badge, Field, Flash, PageTitle, Panel, Select, Table } from "@/components/admin/ui";
import { addDeparturesAction, createPackageAction, setPackagePhotoAction, setPackageStatusAction } from "../actions";

export default async function AdminPackages({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  await connectDB();
  const today = todayIST();
  const [pkgs, operators, props, depCounts] = await Promise.all([
    Package.find().sort({ createdAt: -1 }).lean<PackageDoc[]>(),
    Partner.find({ type: "operator" }).sort({ name: 1 }).lean<PartnerDoc[]>(),
    Property.find().sort({ town: 1 }).lean<PropertyDoc[]>(),
    Departure.aggregate<{ _id: unknown; n: number }>([{ $match: { date: { $gt: today }, status: "open" } }, { $group: { _id: "$packageId", n: { $sum: 1 } } }]),
  ]);
  const depBy = new Map(depCounts.map((d) => [String(d._id), d.n]));
  const opBy = new Map(operators.map((o) => [String(o._id), o]));

  return (
    <>
      <PageTitle title="Packages" sub="Fixed-price trips. Each needs a registered operator and open departure dates." />
      <Flash m={m} />
      <Table head={["Trip", "Operator", "Price", "Floor", "Upcoming dates", "Photo", "Status", ""]}>
        {pkgs.map((p) => (
          <tr key={String(p._id)}>
            <td>{p.status === "live" ? <Link href={`/packages/${p.slug}`} className="underline">{p.title}</Link> : p.title}<br /><span className="font-mono text-xs text-ink-2">{String(p._id)}</span></td>
            <td>{opBy.get(String(p.operatorId))?.name}</td>
            <td>{formatINR(p.price)} / {p.priceUnit}</td>
            <td>{p.priceFloorRef ? formatINR(p.priceFloorRef) : "–"}</td>
            <td>{depBy.get(String(p._id)) ?? 0}</td>
            <td>
              <form action={setPackagePhotoAction} className="flex gap-1">
                <input type="hidden" name="id" value={String(p._id)} />
                <input name="url" defaultValue={p.heroImage?.url ?? ""} placeholder="/images/trips/..." aria-label={`Photo for ${p.title}`} className="field min-h-9 w-44 py-1 text-xs" />
                <button className="btn btn-ghost min-h-9 px-3 text-xs">Save</button>
              </form>
            </td>
            <td><Badge value={p.status ?? "draft"} /></td>
            <td>
              <form action={setPackageStatusAction} className="flex gap-1">
                <input type="hidden" name="id" value={String(p._id)} />
                {p.status !== "live" && <button name="status" value="live" className="btn btn-ghost min-h-9 px-3 text-xs">Set live</button>}
                {p.status === "live" && <button name="status" value="paused" className="btn btn-ghost min-h-9 px-3 text-xs">Pause</button>}
              </form>
            </td>
          </tr>
        ))}
      </Table>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Create a package">
          <form action={createPackageAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" name="title" required placeholder="North Sikkim 2N/3D" />
            <Field label="Region" name="region" required placeholder="North Sikkim" />
            <div className="sm:col-span-2"><Field label="Summary" name="summary" /></div>
            <Field label="Days" name="durationDays" type="number" required defaultValue={3} />
            <Select label="Operator" name="operatorId" options={operators.map((o) => [String(o._id), `${o.name} (${o.verificationStatus})`] as const)} />
            <Field label="Price (₹)" name="priceRupees" type="number" required />
            <Select label="Price is per" name="priceUnit" options={[["person", "Person"], ["vehicle", "Vehicle"]]} />
            <Field label="Govt-notified fare (₹)" name="floorRupees" type="number" hint="Same unit as price. Price cannot go below it." />
            <Field label="Vehicle" name="vehicleType" placeholder="Innova / Xylo" />
            <Field label="Min guests" name="minGuests" type="number" defaultValue={1} />
            <Field label="Max guests" name="maxGuests" type="number" defaultValue={8} />
            <Select label="Permit" name="permitType" options={[["none", "None"], ["RAP", "RAP"], ["PAP", "PAP"]]} />
            <div>
              <span className="label">Routes</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {ROUTES.map((r) => (
                  <label key={r} className="flex min-h-9 items-center gap-1.5"><input type="checkbox" name="routes" value={r} className="h-4 w-4" />{r}</label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Field label="Stay ids, one per night, comma separated" name="stayIds" hint={`Copy ids from Stays. Available: ${props.map((p) => `${p.name} = ${p._id}`).join("; ") || "none yet"}`} />
            </div>
            <div className="sm:col-span-2"><Area label="Itinerary" name="itinerary" rows={4} placeholder={"Gangtok to Lachung | Leave at 9 am via Mangan...\nYumthang Valley | ..."} hint="Title | detail, one line per day." /></div>
            <Area label="Included" name="inclusions" hint="One per line." />
            <Area label="Not included" name="exclusions" hint="One per line." />
            <div className="sm:col-span-2"><button className="btn btn-primary">Create as draft</button></div>
          </form>
        </Panel>

        <Panel title="Add departure dates">
          <form action={addDeparturesAction} className="grid gap-4">
            <Select label="Package" name="packageId" options={pkgs.map((p) => [String(p._id), p.title] as const)} />
            <Field label="From" name="from" type="date" required defaultValue={addDays(today, 1)} />
            <Field label="To" name="to" type="date" required defaultValue={addDays(today, 90)} />
            <Field label="Every N days" name="everyDays" type="number" defaultValue={1} />
            <Field label="Seats (or cabs) per date" name="capacity" type="number" required defaultValue={12} />
            <button className="btn btn-ghost">Add dates</button>
          </form>
        </Panel>
      </div>
    </>
  );
}

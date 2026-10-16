import Link from "next/link";
import { connectDB } from "@/lib/db/connect";
import { Partner, Property, Room, TOWNS, type PartnerDoc, type PropertyDoc } from "@/lib/db/models";
import { Area, Badge, Field, Flash, PageTitle, Panel, Select, Table } from "@/components/admin/ui";
import { createPropertyAction } from "../actions";

export default async function AdminStays({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  await connectDB();
  const [props, owners, roomCounts] = await Promise.all([
    Property.find().sort({ town: 1, name: 1 }).lean<PropertyDoc[]>(),
    Partner.find({ type: { $in: ["homestay", "hotel"] } }).sort({ name: 1 }).lean<PartnerDoc[]>(),
    Room.aggregate<{ _id: unknown; n: number }>([{ $match: { active: true } }, { $group: { _id: "$propertyId", n: { $sum: 1 } } }]),
  ]);
  const roomsBy = new Map(roomCounts.map((r) => [String(r._id), r.n]));

  return (
    <>
      <PageTitle title="Stays and rooms" sub="Add stays for partners, then open nights for sale." />
      <Flash m={m} />
      <Table head={["Stay", "Town", "Type", "Rooms", "Status", "Id"]}>
        {props.map((p) => (
          <tr key={String(p._id)}>
            <td><Link href={`/admin/stays/${p._id}`} className="underline">{p.name}</Link></td>
            <td>{p.town}</td>
            <td>{p.type}</td>
            <td>{roomsBy.get(String(p._id)) ?? 0}</td>
            <td><Badge value={p.status ?? "draft"} /></td>
            <td className="font-mono text-xs text-ink-2">{String(p._id)}</td>
          </tr>
        ))}
      </Table>

      <Panel title="Add a stay" className="mt-8 max-w-3xl">
        <form action={createPropertyAction} className="grid gap-4 sm:grid-cols-2">
          <Select label="Owner (partner)" name="partnerId" options={owners.map((o) => [String(o._id), `${o.name} (${o.verificationStatus})`] as const)} />
          <Field label="Stay name" name="name" required />
          <Select label="Type" name="type" options={[["homestay", "Homestay (max 4 rooms)"], ["hotel", "Hotel"]]} />
          <Select label="Town" name="town" options={TOWNS.map((t) => [t, t] as const)} />
          <div className="sm:col-span-2"><Field label="One-line summary" name="summary" /></div>
          <div className="sm:col-span-2"><Area label="Description" name="description" rows={4} /></div>
          <Area label="Amenities" name="amenities" hint="Comma or line separated." />
          <Area label="House rules" name="houseRules" hint="One per line." />
          <Area label="Distances" name="distances" placeholder={"Yumthang Valley | 24\nZero Point | 47"} hint="Sight | km, one per line." />
          <Field label="Photo URL" name="photoUrl" type="url" hint="Optional. Placeholder art shows until set." />
          <Field label="Tourism registration no." name="registrationNo" />
          <div className="sm:col-span-2"><button className="btn btn-primary">Add stay</button></div>
        </form>
      </Panel>
    </>
  );
}

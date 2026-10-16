import { connectDB } from "@/lib/db/connect";
import { Partner, type PartnerDoc } from "@/lib/db/models";
import { Badge, Field, Flash, PageTitle, Panel, Select, Table } from "@/components/admin/ui";
import { createPartnerAction, setPartnerStatusAction } from "../actions";

export default async function AdminPartners({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  await connectDB();
  const partners = await Partner.find().sort({ createdAt: -1 }).lean<PartnerDoc[]>();
  return (
    <>
      <PageTitle title="Partners" sub="Homestays, hotels and registered operators. Only verified partners can take bookings." />
      <Flash m={m} />
      <Table head={["Name", "Type", "Owner", "WhatsApp", "Commission", "Status", ""]}>
        {partners.map((p) => (
          <tr key={String(p._id)}>
            <td>{p.name}{p.licenceNo && <><br /><span className="font-mono text-xs text-ink-2">{p.licenceNo}</span></>}</td>
            <td>{p.type}</td>
            <td>{p.ownerName}</td>
            <td className="font-mono text-xs">{p.whatsapp}</td>
            <td>{p.commissionPct}%</td>
            <td><Badge value={p.verificationStatus ?? "pending"} /></td>
            <td>
              <form action={setPartnerStatusAction} className="flex gap-1">
                <input type="hidden" name="id" value={String(p._id)} />
                {p.verificationStatus !== "verified" && <button name="status" value="verified" className="btn btn-ghost min-h-9 px-3 text-xs">Verify</button>}
                {p.verificationStatus !== "suspended" && <button name="status" value="suspended" className="btn btn-ghost min-h-9 px-3 text-xs">Suspend</button>}
              </form>
            </td>
          </tr>
        ))}
      </Table>

      <Panel title="Add a partner" className="mt-8 max-w-3xl">
        <form action={createPartnerAction} className="grid gap-4 sm:grid-cols-2">
          <Select label="Type" name="type" options={[["homestay", "Homestay"], ["hotel", "Hotel"], ["operator", "Registered tour operator"]]} />
          <Field label="Business name" name="name" required />
          <Field label="Owner name" name="ownerName" required />
          <Field label="WhatsApp number" name="whatsapp" required placeholder="98xxxxxxxx" />
          <Field label="Email" name="email" type="email" />
          <Field label="Registration / licence no." name="licenceNo" hint="Required for operators." />
          <Field label="Commission %" name="commissionPct" type="number" defaultValue={10} step="0.5" hint="8 to 12." />
          <Field label="Razorpay linked account id" name="razorpayLinkedAccountId" hint="Optional now; needed for automatic payouts." />
          <div className="sm:col-span-2"><button className="btn btn-primary">Add partner</button></div>
        </form>
      </Panel>
    </>
  );
}

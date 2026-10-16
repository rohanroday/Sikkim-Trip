/** Price shown on the checkout page. Uses the same data the hold uses, so shown = charged. */
import { connectDB } from "@/lib/db/connect";
import { Inventory, Package, Property, Room, type PackageDoc, type PropertyDoc, type RoomDoc } from "@/lib/db/models";
import { addDays, isNightDate, nightsBetween, formatNight } from "@/lib/dates";
import type { Paise } from "@/lib/money";

export type Quote = {
  kind: "package" | "stay";
  title: string;
  lines: { label: string; amount: Paise }[];
  total: Paise;
  dateLabel: string;
  guests: number;
  permitType: string;
  /** Exact payload for POST /api/bookings, minus tourist details. */
  request: Record<string, unknown>;
};

export async function quoteFromParams(sp: Record<string, string | undefined>): Promise<Quote | null> {
  await connectDB();
  const guests = Math.max(1, Math.min(20, Number(sp.guests) || 1));

  if (sp.kind === "package" && sp.slug && sp.date && isNightDate(sp.date)) {
    const pkg = await Package.findOne({ slug: sp.slug, status: "live" }).lean<PackageDoc>();
    if (!pkg) return null;
    const perVehicle = pkg.priceUnit === "vehicle";
    const total = perVehicle ? pkg.price : pkg.price * guests;
    const end = addDays(sp.date, pkg.durationDays - 1);
    return {
      kind: "package",
      title: pkg.title,
      lines: [{ label: perVehicle ? `1 vehicle, up to ${pkg.maxGuests} guests` : `${guests} × fixed fare`, amount: total }],
      total,
      dateLabel: pkg.durationDays > 1 ? `${formatNight(sp.date)} to ${formatNight(end)}` : formatNight(sp.date),
      guests,
      permitType: pkg.permitType ?? "none",
      request: { kind: "package", packageSlug: pkg.slug, date: sp.date, guests },
    };
  }

  if (sp.kind === "stay" && sp.slug && sp.room && sp.in && sp.out && isNightDate(sp.in) && isNightDate(sp.out)) {
    const property = await Property.findOne({ slug: sp.slug, status: "live" }).lean<PropertyDoc>();
    if (!property || !/^[a-f0-9]{24}$/i.test(sp.room)) return null;
    const room = await Room.findOne({ _id: sp.room, propertyId: property._id }).lean<RoomDoc>();
    if (!room) return null;
    const nights = nightsBetween(sp.in, sp.out);
    if (!nights.length) return null;
    const inv = await Inventory.find({ roomId: room._id, date: { $in: nights } }).lean();
    if (inv.length !== nights.length) return null;
    const total = inv.reduce((s, r) => s + r.price, 0);
    return {
      kind: "stay",
      title: `${property.name}, ${room.name}`,
      lines: inv
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({ label: `Night of ${formatNight(r.date)}`, amount: r.price })),
      total,
      dateLabel: `${formatNight(sp.in)} to ${formatNight(sp.out)}`,
      guests: Math.min(guests, room.capacity),
      permitType: "none",
      request: { kind: "stay", propertySlug: property.slug, roomId: String(room._id), checkIn: sp.in, checkOut: sp.out, guests: Math.min(guests, room.capacity) },
    };
  }
  return null;
}

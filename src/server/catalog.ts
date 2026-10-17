/** Read models for public pages. Everything returned here is plain JSON (safe for client components). */
import { connectDB } from "@/server/db/connect";
import {
  Departure,
  Inventory,
  Package,
  Partner,
  Property,
  Room,
  type PackageDoc,
  type PartnerDoc,
  type PropertyDoc,
  type RoomDoc,
} from "@/server/db/models";
import { addDays, todayIST, type NightDate } from "@/lib/dates";
import { closuresFor } from "@/server/routeClosures";

export type PackageCard = {
  slug: string;
  title: string;
  region: string;
  summary: string;
  durationDays: number;
  price: number;
  priceUnit: "person" | "vehicle";
  priceFloorRef: number | null;
  permitType: string;
  vehicleType: string;
  nextDate: string | null;
};

function toCard(p: PackageDoc, nextDate: string | null): PackageCard {
  return {
    slug: p.slug,
    title: p.title,
    region: p.region,
    summary: p.summary ?? "",
    durationDays: p.durationDays,
    price: p.price,
    priceUnit: p.priceUnit === "vehicle" ? "vehicle" : "person",
    priceFloorRef: p.priceFloorRef ?? null,
    permitType: p.permitType ?? "none",
    vehicleType: p.vehicleType ?? "",
    nextDate,
  };
}

export async function listLivePackages(): Promise<PackageCard[]> {
  await connectDB();
  const today = todayIST();
  const pkgs = await Package.find({ status: "live" }).sort({ price: -1 }).lean<PackageDoc[]>();
  const next = await Departure.aggregate<{ _id: unknown; date: string }>([
    { $match: { packageId: { $in: pkgs.map((p) => p._id) }, status: "open", date: { $gt: today }, seatsLeft: { $gt: 0 } } },
    { $sort: { date: 1 } },
    { $group: { _id: "$packageId", date: { $first: "$date" } } },
  ]);
  const nextBy = new Map(next.map((n) => [String(n._id), n.date]));
  return pkgs.map((p) => toCard(p, nextBy.get(String(p._id)) ?? null));
}

export type DepartureOption = { date: string; seatsLeft: number; closed: boolean; closedNote: string };

export type PackageDetail = PackageCard & {
  itinerary: { day: number; title: string; detail: string }[];
  inclusions: string[];
  exclusions: string[];
  minGuests: number;
  maxGuests: number;
  routes: string[];
  operator: { name: string; licenceNo: string } | null;
  stays: { night: number; name: string; town: string; slug: string }[];
  departures: DepartureOption[];
};

export async function getPackage(slug: string): Promise<PackageDetail | null> {
  await connectDB();
  const p = await Package.findOne({ slug, status: "live" }).lean<PackageDoc>();
  if (!p) return null;
  const today = todayIST();
  const [operator, properties, deps] = await Promise.all([
    Partner.findById(p.operatorId).lean<PartnerDoc>(),
    Property.find({ _id: { $in: (p.stays ?? []).map((s) => s.propertyId) } }).lean<PropertyDoc[]>(),
    Departure.find({ packageId: p._id, status: "open", date: { $gt: today } }).sort({ date: 1 }).limit(60).lean(),
  ]);
  const last = deps.at(-1)?.date ?? today;
  const closures = await closuresFor(p.routes ?? [], today, addDays(last, p.durationDays));
  const propById = new Map(properties.map((x) => [String(x._id), x]));
  const departures = deps.map((d) => {
    const end = addDays(d.date, p.durationDays - 1);
    const hit = closures.find((c) => c.from <= end && c.to >= d.date);
    return { date: d.date, seatsLeft: d.seatsLeft, closed: Boolean(hit), closedNote: hit?.note ?? "" };
  });
  return {
    ...toCard(p, departures.find((d) => !d.closed && d.seatsLeft > 0)?.date ?? null),
    itinerary: (p.itinerary ?? []).map((i) => ({ day: i.day ?? 0, title: i.title ?? "", detail: i.detail ?? "" })),
    inclusions: p.inclusions ?? [],
    exclusions: p.exclusions ?? [],
    minGuests: p.minGuests ?? 1,
    maxGuests: p.maxGuests ?? 8,
    routes: p.routes ?? [],
    operator: operator ? { name: operator.name, licenceNo: operator.licenceNo ?? "" } : null,
    stays: (p.stays ?? []).flatMap((s) => {
      const prop = propById.get(String(s.propertyId));
      return prop ? [{ night: s.night ?? 0, name: prop.name, town: prop.town, slug: prop.slug }] : [];
    }),
    departures,
  };
}

export type StayCard = {
  slug: string;
  name: string;
  type: string;
  town: string;
  summary: string;
  fromPrice: number | null;
  freeTonight: boolean;
  photo: { url: string; alt: string } | null;
};

export async function listLiveStays(town?: string): Promise<StayCard[]> {
  await connectDB();
  const today = todayIST();
  const filter: Record<string, unknown> = { status: "live" };
  if (town) filter.town = town;
  const props = await Property.find(filter).sort({ town: 1, name: 1 }).limit(60).lean<PropertyDoc[]>();
  const ids = props.map((p) => p._id);
  const [prices, tonight] = await Promise.all([
    Inventory.aggregate<{ _id: unknown; min: number }>([
      { $match: { propertyId: { $in: ids }, date: { $gte: today }, status: "available" } },
      { $group: { _id: "$propertyId", min: { $min: "$price" } } },
    ]),
    Inventory.aggregate<{ _id: unknown }>([
      { $match: { propertyId: { $in: ids }, date: today, status: "available" } },
      { $group: { _id: "$propertyId" } },
    ]),
  ]);
  const minBy = new Map(prices.map((x) => [String(x._id), x.min]));
  const freeSet = new Set(tonight.map((x) => String(x._id)));
  return props.map((p) => ({
    slug: p.slug,
    name: p.name,
    type: p.type,
    town: p.town,
    summary: p.summary ?? "",
    fromPrice: minBy.get(String(p._id)) ?? null,
    freeTonight: freeSet.has(String(p._id)),
    photo: p.photos?.[0]?.url ? { url: p.photos[0].url, alt: p.photos[0].alt ?? p.name } : null,
  }));
}

export type NightCell = { date: NightDate; status: "available" | "taken" | "closed"; price: number | null };
export type StayDetail = StayCard & {
  description: string;
  amenities: string[];
  houseRules: string[];
  distances: { sight: string; km: number }[];
  registrationNo: string;
  rooms: { id: string; name: string; capacity: number; nights: NightCell[] }[];
};

export const CALENDAR_DAYS = 60;

export async function getStay(slug: string, now = new Date()): Promise<StayDetail | null> {
  await connectDB();
  const p = await Property.findOne({ slug, status: "live" }).lean<PropertyDoc>();
  if (!p) return null;
  const today = todayIST(now);
  const end = addDays(today, CALENDAR_DAYS);
  const rooms = await Room.find({ propertyId: p._id, active: true }).sort({ capacity: 1, name: 1 }).lean<RoomDoc[]>();
  const inv = await Inventory.find({ propertyId: p._id, date: { $gte: today, $lt: end } }).lean();
  const key = (roomId: unknown, date: string) => `${String(roomId)}|${date}`;
  const invBy = new Map(inv.map((i) => [key(i.roomId, i.date), i]));
  const days = Array.from({ length: CALENDAR_DAYS }, (_, i) => addDays(today, i));

  const roomsOut = rooms.map((r) => ({
    id: String(r._id),
    name: r.name,
    capacity: r.capacity,
    nights: days.map((date): NightCell => {
      const row = invBy.get(key(r._id, date));
      if (!row) return { date, status: "closed", price: null };
      // A hold that ran out but has not been swept yet still counts as free to the visitor.
      const staleHold = row.status === "held" && row.holdExpiresAt && row.holdExpiresAt < now;
      const free = row.status === "available" || staleHold;
      return { date, status: free ? "available" : "taken", price: free ? row.price : null };
    }),
  }));
  const allPrices = roomsOut.flatMap((r) => r.nights.filter((n) => n.price != null).map((n) => n.price!));

  return {
    slug: p.slug,
    name: p.name,
    type: p.type,
    town: p.town,
    summary: p.summary ?? "",
    fromPrice: allPrices.length ? Math.min(...allPrices) : null,
    freeTonight: roomsOut.some((r) => r.nights[0]?.status === "available"),
    photo: p.photos?.[0]?.url ? { url: p.photos[0].url, alt: p.photos[0].alt ?? p.name } : null,
    description: p.description ?? "",
    amenities: p.amenities ?? [],
    houseRules: p.houseRules ?? [],
    distances: (p.distances ?? []).map((d) => ({ sight: d.sight ?? "", km: d.km ?? 0 })),
    registrationNo: p.registrationNo ?? "",
    rooms: roomsOut,
  };
}

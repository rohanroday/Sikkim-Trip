/** Admin operations on partners, stays, inventory and packages (A-01, A-03, A-04, A-05). */
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Departure, Inventory, Package, Partner, Property, Room, MAX_HOMESTAY_ROOMS, type PartnerDoc } from "@/lib/db/models";
import { addDays, diffDays, isNightDate } from "@/lib/dates";
import { normalizePhone } from "@/lib/phone";
import { rupeesToPaise, MIN_COMMISSION_PCT, MAX_COMMISSION_PCT } from "@/lib/money";
import { audit } from "@/lib/audit";
import { NotFoundError, ValidationError } from "@/lib/errors";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const nightDate = z.string().refine(isNightDate, "Use a valid date.");
const lines = (s: string | undefined) => (s ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

// --- partners ---
export const partnerInput = z.object({
  type: z.enum(["homestay", "hotel", "operator"]),
  name: z.string().trim().min(2),
  ownerName: z.string().trim().min(2),
  whatsapp: z.string().trim(),
  email: z.string().trim().email().optional().or(z.literal("")),
  licenceNo: z.string().trim().optional(),
  commissionPct: z.coerce.number().min(MIN_COMMISSION_PCT).max(MAX_COMMISSION_PCT),
  razorpayLinkedAccountId: z.string().trim().optional(),
});

export async function createPartner(raw: unknown, actor: string) {
  await connectDB();
  const input = partnerInput.parse(raw);
  const whatsapp = normalizePhone(input.whatsapp);
  if (!whatsapp) throw new ValidationError("WhatsApp number is not valid.");
  if (input.type === "operator" && !input.licenceNo) throw new ValidationError("Operators need their Sikkim tourist trade registration number.");
  const p = await Partner.create({ ...input, whatsapp, email: input.email || undefined });
  await audit({ actor, action: "partner.created", entity: "partner", entityId: String(p._id), after: { name: p.name, type: p.type } });
  return p;
}

export async function setPartnerVerification(id: string, status: "pending" | "verified" | "suspended", actor: string) {
  await connectDB();
  const before = await Partner.findByIdAndUpdate(id, { verificationStatus: status }).lean<PartnerDoc>();
  if (!before) throw new NotFoundError();
  await audit({ actor, action: `partner.${status}`, entity: "partner", entityId: id, before: { status: before.verificationStatus }, after: { status } });
}

// --- properties and rooms ---
export const propertyInput = z.object({
  partnerId: z.string().regex(/^[a-f0-9]{24}$/i),
  name: z.string().trim().min(2),
  type: z.enum(["homestay", "hotel"]),
  town: z.string().trim().min(2),
  summary: z.string().trim().max(300).default(""),
  description: z.string().trim().max(3000).default(""),
  amenities: z.string().optional(),
  houseRules: z.string().optional(),
  distances: z.string().optional(), // "Yumthang Valley | 24" per line
  photoUrl: z.string().trim().url().optional().or(z.literal("")),
  registrationNo: z.string().trim().optional(),
});

export async function createProperty(raw: unknown, actor: string) {
  await connectDB();
  const input = propertyInput.parse(raw);
  const owner = await Partner.findById(input.partnerId).lean<PartnerDoc>();
  if (!owner || owner.type === "operator") throw new ValidationError("Pick a homestay or hotel partner.");
  let slug = slugify(`${input.name}-${input.town}`);
  if (await Property.exists({ slug })) slug = `${slug}-${new Types.ObjectId().toString().slice(-4)}`;
  const p = await Property.create({
    partnerId: owner._id,
    slug,
    name: input.name,
    type: input.type,
    town: input.town,
    summary: input.summary,
    description: input.description,
    amenities: lines(input.amenities?.replace(/,/g, "\n")),
    houseRules: lines(input.houseRules),
    distances: lines(input.distances).map((l) => {
      const [sight, km] = l.split("|").map((x) => x.trim());
      return { sight, km: Number(km) || 0 };
    }),
    photos: input.photoUrl ? [{ url: input.photoUrl, alt: input.name }] : [],
    registrationNo: input.registrationNo,
    status: "draft",
  });
  await audit({ actor, action: "property.created", entity: "property", entityId: String(p._id), after: { name: p.name } });
  return p;
}

export async function setPropertyStatus(id: string, status: "draft" | "live" | "paused", actor: string) {
  await connectDB();
  if (status === "live" && !(await Room.exists({ propertyId: id, active: true }))) throw new ValidationError("Add at least one room before going live.");
  await Property.updateOne({ _id: id }, { status });
  await audit({ actor, action: `property.${status}`, entity: "property", entityId: id });
}

export const roomInput = z.object({
  propertyId: z.string().regex(/^[a-f0-9]{24}$/i),
  name: z.string().trim().min(1),
  capacity: z.coerce.number().int().min(1).max(8),
  priceRupees: z.coerce.number().min(100).max(200000),
});

export async function addRoom(raw: unknown, actor: string) {
  await connectDB();
  const input = roomInput.parse(raw);
  const property = await Property.findById(input.propertyId).lean();
  if (!property) throw new NotFoundError();
  if (property.type === "homestay" && (await Room.countDocuments({ propertyId: property._id, active: true })) >= MAX_HOMESTAY_ROOMS) {
    throw new ValidationError(`Homestays can have at most ${MAX_HOMESTAY_ROOMS} rooms under state rules.`);
  }
  const room = await Room.create({ propertyId: property._id, name: input.name, capacity: input.capacity, basePrice: rupeesToPaise(input.priceRupees) });
  await audit({ actor, action: "room.created", entity: "room", entityId: String(room._id) });
  return room;
}

export const inventoryInput = z.object({
  roomId: z.string().regex(/^[a-f0-9]{24}$/i),
  from: nightDate,
  to: nightDate,
  priceRupees: z.coerce.number().min(100).max(200000).optional(),
  action: z.enum(["open", "block", "unblock"]),
});

/**
 * Open nights for sale (creates missing nights, re-prices available ones),
 * block them, or unblock them. Never touches held or booked nights.
 */
export async function editInventory(raw: unknown, actor: string): Promise<number> {
  await connectDB();
  const input = inventoryInput.parse(raw);
  const span = diffDays(input.from, input.to);
  if (span < 0 || span > 366) throw new ValidationError("Pick a range of up to one year.");
  const room = await Room.findById(input.roomId).lean();
  if (!room) throw new NotFoundError();
  const dates = Array.from({ length: span + 1 }, (_, i) => addDays(input.from, i));
  let changed = 0;

  if (input.action === "open") {
    const price = input.priceRupees ? rupeesToPaise(input.priceRupees) : room.basePrice;
    const ops = dates.map((date) => ({
      updateOne: {
        filter: { roomId: room._id, date },
        update: { $setOnInsert: { roomId: room._id, propertyId: room.propertyId, date, status: "available" as const, source: "manual" as const } },
        upsert: true,
      },
    }));
    const r1 = await Inventory.bulkWrite(ops);
    const r2 = await Inventory.updateMany({ roomId: room._id, date: { $in: dates }, status: "available" }, { $set: { price } });
    changed = r1.upsertedCount + r2.modifiedCount;
  } else if (input.action === "block") {
    changed = (await Inventory.updateMany({ roomId: room._id, date: { $in: dates }, status: "available" }, { status: "blocked" })).modifiedCount;
  } else {
    changed = (await Inventory.updateMany({ roomId: room._id, date: { $in: dates }, status: "blocked" }, { status: "available" })).modifiedCount;
  }
  await audit({ actor, action: `inventory.${input.action}`, entity: "room", entityId: input.roomId, after: { from: input.from, to: input.to, changed } });
  return changed;
}

// --- packages ---
export const packageInput = z.object({
  title: z.string().trim().min(3),
  region: z.string().trim().min(2),
  summary: z.string().trim().max(400).default(""),
  durationDays: z.coerce.number().int().min(1).max(15),
  operatorId: z.string().regex(/^[a-f0-9]{24}$/i),
  stayIds: z.string().optional(), // property ids, one per night, comma separated
  vehicleType: z.string().trim().default(""),
  priceRupees: z.coerce.number().min(100),
  priceUnit: z.enum(["person", "vehicle"]),
  floorRupees: z.coerce.number().min(0).optional(),
  minGuests: z.coerce.number().int().min(1).default(1),
  maxGuests: z.coerce.number().int().min(1).max(20).default(8),
  permitType: z.enum(["none", "RAP", "PAP"]),
  routes: z.array(z.string()).default([]),
  itinerary: z.string().optional(), // "Title | detail" per line, one per day
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
});

export async function createPackage(raw: unknown, actor: string) {
  await connectDB();
  const input = packageInput.parse(raw);
  const operator = await Partner.findById(input.operatorId).lean<PartnerDoc>();
  if (!operator || operator.type !== "operator") throw new ValidationError("Pick a registered operator.");
  const price = rupeesToPaise(input.priceRupees);
  const floor = input.floorRupees ? rupeesToPaise(input.floorRupees) : undefined;
  if (floor != null && price < floor) throw new ValidationError("Price cannot be below the government-notified fare.");
  const stayIds = (input.stayIds ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (stayIds.some((id) => !/^[a-f0-9]{24}$/i.test(id))) throw new ValidationError("Stay ids look wrong.");
  if (stayIds.length > Math.max(0, input.durationDays - 1)) throw new ValidationError("More stays than nights.");
  let slug = slugify(input.title);
  if (await Package.exists({ slug })) slug = `${slug}-${new Types.ObjectId().toString().slice(-4)}`;

  const pkg = await Package.create({
    slug,
    title: input.title,
    region: input.region,
    summary: input.summary,
    durationDays: input.durationDays,
    operatorId: operator._id,
    stays: stayIds.map((propertyId, night) => ({ night, propertyId })),
    vehicleType: input.vehicleType,
    price,
    priceUnit: input.priceUnit,
    priceFloorRef: floor,
    minGuests: input.minGuests,
    maxGuests: input.maxGuests,
    permitType: input.permitType,
    routes: input.routes,
    itinerary: lines(input.itinerary).map((l, i) => {
      const [title, ...rest] = l.split("|");
      return { day: i + 1, title: title.trim(), detail: rest.join("|").trim() };
    }),
    inclusions: lines(input.inclusions),
    exclusions: lines(input.exclusions),
    status: "draft",
  });
  await audit({ actor, action: "package.created", entity: "package", entityId: String(pkg._id), after: { title: pkg.title, price } });
  return pkg;
}

export async function setPackageStatus(id: string, status: "draft" | "live" | "paused", actor: string) {
  await connectDB();
  await Package.updateOne({ _id: id }, { status });
  await audit({ actor, action: `package.${status}`, entity: "package", entityId: id });
}

export const departuresInput = z.object({
  packageId: z.string().regex(/^[a-f0-9]{24}$/i),
  from: nightDate,
  to: nightDate,
  everyDays: z.coerce.number().int().min(1).max(30).default(1),
  capacity: z.coerce.number().int().min(1).max(200),
});

export async function addDepartures(raw: unknown, actor: string): Promise<number> {
  await connectDB();
  const input = departuresInput.parse(raw);
  const span = diffDays(input.from, input.to);
  if (span < 0 || span > 366) throw new ValidationError("Pick a range of up to one year.");
  const dates: string[] = [];
  for (let i = 0; i <= span; i += input.everyDays) dates.push(addDays(input.from, i));
  const res = await Departure.bulkWrite(
    dates.map((date) => ({
      updateOne: {
        filter: { packageId: new Types.ObjectId(input.packageId), date },
        update: { $setOnInsert: { packageId: new Types.ObjectId(input.packageId), date, capacity: input.capacity, seatsLeft: input.capacity, status: "open" } },
        upsert: true,
      },
    })),
  );
  await audit({ actor, action: "departures.added", entity: "package", entityId: input.packageId, after: { count: res.upsertedCount } });
  return res.upsertedCount;
}

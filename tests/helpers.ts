import mongoose, { type Types } from "mongoose";
import { inject } from "vitest";
import { connectDB } from "@/lib/db/connect";
import { Booking, Departure, Inventory, Package, Partner, Property, Room } from "@/lib/db/models";
import { addDays, todayIST } from "@/lib/dates";
import { rupeesToPaise } from "@/lib/money";

export async function setupDb() {
  process.env.MONGODB_URI = inject("mongoUri");
  // A previous test file may have disconnected; drop the cached connection.
  (globalThis as { __mongoose?: unknown }).__mongoose = undefined;
  await connectDB();
  // Indexes must exist before transactions touch the collections.
  await Promise.all(Object.values(mongoose.models).map((m) => m.createCollection().then(() => m.syncIndexes())));
}

export async function resetDb() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export const TODAY = todayIST();
export const inDays = (n: number) => addDays(TODAY, n);

export async function makeStay(opts: { rooms?: { name: string; capacity: number; price: number }[]; nights?: string[] } = {}) {
  const owner = await Partner.create({
    type: "homestay",
    name: "Lachung Valley Homestay",
    ownerName: "Karma",
    whatsapp: "+919800000001",
    verificationStatus: "verified",
    commissionPct: 10,
  });
  const property = await Property.create({
    partnerId: owner._id,
    slug: "lachung-valley-" + owner._id.toString().slice(-6),
    name: "Lachung Valley Homestay",
    type: "homestay",
    town: "Lachung",
    status: "live",
  });
  const roomSpecs = opts.rooms ?? [{ name: "Room 1", capacity: 2, price: 2500 }];
  const rooms = [];
  for (const r of roomSpecs) {
    rooms.push(await Room.create({ propertyId: property._id, name: r.name, capacity: r.capacity, basePrice: rupeesToPaise(r.price) }));
  }
  const nights = opts.nights ?? [inDays(10), inDays(11)];
  for (const room of rooms) {
    await Inventory.insertMany(nights.map((date) => ({ roomId: room._id, propertyId: property._id, date, price: room.basePrice })));
  }
  return { owner, property, rooms, nights };
}

export async function makePackage(stay: { property: { _id: Types.ObjectId } }, opts: { date?: string; seats?: number } = {}) {
  const operator = await Partner.create({
    type: "operator",
    name: "Kanchen Tours",
    ownerName: "Pema",
    whatsapp: "+919800000002",
    verificationStatus: "verified",
    licenceNo: "SK-TT-0001",
    commissionPct: 10,
  });
  const pkg = await Package.create({
    slug: "north-sikkim-" + operator._id.toString().slice(-6),
    title: "North Sikkim 2N/3D",
    region: "North Sikkim",
    durationDays: 3,
    operatorId: operator._id,
    stays: [
      { night: 0, propertyId: stay.property._id },
      { night: 1, propertyId: stay.property._id },
    ],
    price: rupeesToPaise(10000),
    permitType: "RAP",
    routes: ["north-sikkim", "lachung"],
    status: "live",
  });
  const date = opts.date ?? inDays(10);
  await Departure.create({ packageId: pkg._id, date, capacity: opts.seats ?? 10, seatsLeft: opts.seats ?? 10 });
  return { operator, pkg, date };
}

export const TOURIST = { name: "Priya Sharma", email: "" };
export const TOURIST_PHONE = "+919812345678";

export async function bookingStatus(id: Types.ObjectId) {
  return (await Booking.findById(id).lean())!.status;
}

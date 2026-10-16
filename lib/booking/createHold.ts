import { Types, type ClientSession } from "mongoose";
import { withTransaction, connectDB } from "@/lib/db/connect";
import {
  Booking,
  Departure,
  Inventory,
  Package,
  Partner,
  Property,
  Room,
  type BookingDoc,
  type PackageDoc,
  type PartnerDoc,
  type PropertyDoc,
  type RoomDoc,
} from "@/lib/db/models";
import { addDays, diffDays, nightsBetween, todayIST, type NightDate } from "@/lib/dates";
import { commissionFor, type Paise } from "@/lib/money";
import { ConfigError, HoldConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { assertRoutesOpen } from "@/lib/routes";
import { holdExpiry, holdRoomNights, holdSeats, pickRoomsForGuests } from "@/lib/inventory/holds";
import { releaseExpiredHolds } from "@/lib/booking/expire";
import { newAccessToken, newBookingCode } from "@/lib/booking/code";
import { audit } from "@/lib/audit";
import type { CreateHoldInput } from "@/lib/booking/schemas";

export const MAX_STAY_NIGHTS = 14;

type Item = {
  type: "package" | "stay";
  label: string;
  partnerId: Types.ObjectId;
  packageId?: Types.ObjectId;
  departureDate?: string;
  seats?: number;
  propertyId?: Types.ObjectId;
  roomId?: Types.ObjectId;
  nights?: string[];
  amount: Paise;
};

async function nightsTotal(roomId: Types.ObjectId, nights: NightDate[], session: ClientSession): Promise<Paise> {
  const rows = await Inventory.find({ roomId, date: { $in: nights } }, { price: 1 }, { session }).lean();
  return rows.reduce((sum, r) => sum + r.price, 0);
}

/** Group package nights into runs at the same property: [{propertyId, nights[]}]. */
export function staySegments(
  pkg: Pick<PackageDoc, "stays">,
  start: NightDate,
  nightCount: number,
): { propertyId: Types.ObjectId; nights: NightDate[] }[] {
  const byNight = new Map<number, Types.ObjectId>();
  for (const s of pkg.stays ?? []) if (s.propertyId != null && s.night != null) byNight.set(s.night, s.propertyId);
  const segments: { propertyId: Types.ObjectId; nights: NightDate[] }[] = [];
  for (let i = 0; i < nightCount; i++) {
    const pid = byNight.get(i);
    if (!pid) continue;
    const last = segments[segments.length - 1];
    const date = addDays(start, i);
    if (last && String(last.propertyId) === String(pid) && last.nights[last.nights.length - 1] === addDays(start, i - 1)) {
      last.nights.push(date);
    } else {
      segments.push({ propertyId: pid, nights: [date] });
    }
  }
  return segments;
}

function assertVerified(p: PartnerDoc | null, what: string): asserts p is PartnerDoc {
  if (!p || p.verificationStatus !== "verified") throw new ValidationError(`This ${what} is not taking bookings right now.`);
}

/**
 * Create a held booking: seats and room-nights flip to held inside one
 * transaction for HOLD_MINUTES. Returns the booking and its status-link token.
 */
export async function createHold(
  input: CreateHoldInput,
  touristPhone: string,
  now: Date = new Date(),
): Promise<{ booking: BookingDoc; accessToken: string }> {
  await connectDB();
  const today = todayIST(now);
  // Free up any stale holds first so they never block a real booking.
  await releaseExpiredHolds(now);

  const bookingId = new Types.ObjectId();
  const expiresAt = holdExpiry(now);
  const accessToken = newAccessToken();
  const tourist = { name: input.tourist.name, phone: touristPhone, email: input.tourist.email || undefined };

  if (input.kind === "package") {
    const pkg = await Package.findOne({ slug: input.packageSlug, status: "live" }).lean<PackageDoc>();
    if (!pkg) throw new NotFoundError("That trip is not available.");
    if (input.date <= today) throw new ValidationError("Please pick a date from tomorrow onwards.");
    if (input.guests < (pkg.minGuests ?? 1) || input.guests > (pkg.maxGuests ?? 8)) {
      throw new ValidationError(`This trip takes ${pkg.minGuests} to ${pkg.maxGuests} guests.`);
    }
    if (pkg.priceFloorRef != null && pkg.price < pkg.priceFloorRef) {
      throw new ConfigError("Package price is below the notified fare.");
    }
    const operator = await Partner.findById(pkg.operatorId).lean<PartnerDoc>();
    assertVerified(operator, "trip");
    const endDate = addDays(input.date, pkg.durationDays - 1);
    await assertRoutesOpen(pkg.routes ?? [], input.date, endDate);

    const segments = staySegments(pkg, input.date, Math.max(0, pkg.durationDays - 1));
    const properties = await Property.find({ _id: { $in: segments.map((s) => s.propertyId) } }).lean<PropertyDoc[]>();
    const partners = await Partner.find({ _id: { $in: properties.map((p) => p.partnerId) } }).lean<PartnerDoc[]>();
    const partnerById = new Map(partners.map((p) => [String(p._id), p]));
    const propertyById = new Map(properties.map((p) => [String(p._id), p]));
    const perVehicle = pkg.priceUnit === "vehicle";
    const total = perVehicle ? pkg.price : pkg.price * input.guests;
    // A per-vehicle trip uses one vehicle slot on the departure, whatever the group size.
    const seats = perVehicle ? 1 : input.guests;

    const booking = await withTransaction(async (session) => {
      await holdSeats({ packageId: pkg._id, date: input.date, seats }, session);
      const items: Item[] = [];
      for (const seg of segments) {
        const property = propertyById.get(String(seg.propertyId));
        if (!property) throw new ConfigError("A stay on this trip is missing.");
        const owner = partnerById.get(String(property.partnerId));
        assertVerified(owner ?? null, "stay");
        const rooms = await pickRoomsForGuests({ propertyId: property._id, nights: seg.nights, guests: input.guests }, session);
        for (const room of rooms) {
          await holdRoomNights({ roomId: room._id, nights: seg.nights, bookingId, expiresAt }, session);
          items.push({
            type: "stay",
            label: `${property.name}, ${room.name}`,
            partnerId: owner!._id,
            propertyId: property._id,
            roomId: room._id,
            nights: seg.nights,
            amount: await nightsTotal(room._id, seg.nights, session),
          });
        }
      }
      const staysCost = items.reduce((s, i) => s + i.amount, 0);
      if (staysCost > total) throw new ConfigError("Package price is below the cost of its stays.");
      items.unshift({
        type: "package",
        label: pkg.title,
        partnerId: operator._id,
        packageId: pkg._id,
        departureDate: input.date,
        seats,
        amount: total - staysCost,
      });
      return insertBooking(
        {
          bookingId,
          accessToken,
          kind: "package",
          tourist,
          packageId: pkg._id,
          startDate: input.date,
          endDate,
          guests: input.guests,
          items,
          amount: total,
          expiresAt,
          permitRequired: pkg.permitType !== "none",
          partners: new Map([...partnerById, [String(operator._id), operator]]),
        },
        session,
      );
    });
    return { booking, accessToken };
  }

  // Stay booking
  const property = await Property.findOne({ slug: input.propertySlug, status: "live" }).lean<PropertyDoc>();
  if (!property) throw new NotFoundError("That stay is not available.");
  const room = await Room.findOne({ _id: input.roomId, propertyId: property._id, active: true }).lean<RoomDoc>();
  if (!room) throw new NotFoundError("That room is not available.");
  if (input.checkIn < today) throw new ValidationError("Check-in cannot be in the past.");
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights.length < 1) throw new ValidationError("Check-out must be after check-in.");
  if (nights.length > MAX_STAY_NIGHTS) throw new ValidationError(`You can book up to ${MAX_STAY_NIGHTS} nights at a time.`);
  if (input.guests > room.capacity) throw new ValidationError(`This room sleeps up to ${room.capacity}.`);
  const owner = await Partner.findById(property.partnerId).lean<PartnerDoc>();
  assertVerified(owner, "stay");

  const booking = await withTransaction(async (session) => {
    await holdRoomNights({ roomId: room._id, nights, bookingId, expiresAt }, session);
    const amount = await nightsTotal(room._id, nights, session);
    return insertBooking(
      {
        bookingId,
        accessToken,
        kind: "stay",
        tourist,
        propertyId: property._id,
        startDate: input.checkIn,
        endDate: input.checkOut,
        guests: input.guests,
        items: [
          {
            type: "stay",
            label: `${property.name}, ${room.name}`,
            partnerId: owner._id,
            propertyId: property._id,
            roomId: room._id,
            nights,
            amount,
          },
        ],
        amount,
        expiresAt,
        permitRequired: false,
        partners: new Map([[String(owner._id), owner]]),
      },
      session,
    );
  });
  return { booking, accessToken };
}

async function insertBooking(
  a: {
    bookingId: Types.ObjectId;
    accessToken: string;
    kind: "package" | "stay";
    tourist: { name: string; phone: string; email?: string };
    packageId?: Types.ObjectId;
    propertyId?: Types.ObjectId;
    startDate: NightDate;
    endDate: NightDate;
    guests: number;
    items: Item[];
    amount: Paise;
    expiresAt: Date;
    permitRequired: boolean;
    partners: Map<string, PartnerDoc>;
  },
  session: ClientSession,
): Promise<BookingDoc> {
  if (diffDays(a.startDate, a.endDate) < 0) throw new ValidationError("Dates are out of order.");
  if (a.amount <= 0) throw new HoldConflictError("Prices are not set for those dates yet.");
  const items = a.items.map((i) => {
    const partner = a.partners.get(String(i.partnerId));
    if (!partner) throw new ConfigError("Partner missing for booking item.");
    return { ...i, commission: commissionFor(i.amount, partner.commissionPct ?? 10) };
  });
  const [doc] = await Booking.create(
    [
      {
        _id: a.bookingId,
        code: newBookingCode(),
        accessToken: a.accessToken,
        kind: a.kind,
        tourist: a.tourist,
        packageId: a.packageId,
        propertyId: a.propertyId,
        startDate: a.startDate,
        endDate: a.endDate,
        guests: a.guests,
        items,
        amount: a.amount,
        commission: items.reduce((s, i) => s + i.commission, 0),
        status: "held",
        statusHistory: [{ from: "", to: "held", at: new Date(), actor: "tourist" }],
        holdExpiresAt: a.expiresAt,
        permitRequired: a.permitRequired,
      },
    ],
    { session },
  );
  await audit({ actor: "tourist", action: "booking.held", entity: "booking", entityId: String(a.bookingId) }, session);
  return doc.toObject() as BookingDoc;
}

/** Departures still open for sale for a package, today onwards. */
export async function openDepartures(packageId: Types.ObjectId, today: NightDate) {
  return Departure.find({ packageId, status: "open", date: { $gt: today } }).sort({ date: 1 }).limit(60).lean();
}

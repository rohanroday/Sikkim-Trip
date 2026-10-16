/**
 * Sample data for local development: 1 operator, 3 homestays, 3 launch packages,
 * 90 days of rooms and departures. All names are invented and marked "(sample)".
 *
 *   npm run seed            only seeds an empty database
 *   npm run seed -- --reset wipes catalog and bookings first (never run against production)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Booking, Departure, Inventory, Package, Partner, PermitRequest, Property, Room } from "@/lib/db/models";
import { addDays, todayIST } from "@/lib/dates";
import { rupeesToPaise } from "@/lib/money";

const DAYS = 90;

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production.");
  await connectDB();
  await Promise.all(Object.values(mongoose.models).map((m) => m.createCollection().then(() => m.syncIndexes())));

  const reset = process.argv.includes("--reset");
  if (reset) {
    for (const m of [Partner, Property, Room, Inventory, Package, Departure, Booking, PermitRequest] as unknown as mongoose.Model<unknown>[]) {
      await m.deleteMany({});
    }
    console.log("Cleared catalog and bookings.");
  } else if (await Package.exists({})) {
    console.log("Database already has packages. Use --reset to start over.");
    return;
  }

  const today = todayIST();
  const operator = await Partner.create({
    type: "operator",
    name: "Kanchen Trails (sample)",
    ownerName: "Pema Bhutia",
    whatsapp: "+919800000010",
    verificationStatus: "verified",
    licenceNo: "SAMPLE-TT-0001",
    commissionPct: 10,
  });

  const stays = [
    {
      partner: { name: "Yumthang View Homestay (sample)", ownerName: "Karma Lachungpa", whatsapp: "+919800000011" },
      property: {
        name: "Yumthang View Homestay (sample)",
        town: "Lachung",
        summary: "Three warm rooms in a wooden family house above the Lachung river.",
        description: "A family home run by Karma and his mother. Breakfast and dinner are home-cooked, with butter tea on cold mornings. Hot water by bucket, thick quilts, and a view of the valley from every room.",
        amenities: ["Home-cooked meals", "Hot water", "Room heater", "Valley view", "Parking"],
        houseRules: ["Quiet after 10 pm", "No smoking indoors", "Shoes off inside the house"],
        distances: [{ sight: "Yumthang Valley", km: 24 }, { sight: "Zero Point", km: 47 }, { sight: "Lachung Monastery", km: 2 }],
      },
      rooms: [
        { name: "Valley room", capacity: 2, price: 2800 },
        { name: "River room", capacity: 2, price: 2600 },
        { name: "Family room", capacity: 4, price: 4200 },
      ],
    },
    {
      partner: { name: "Rabdentse Garden Stay (sample)", ownerName: "Dawa Subba", whatsapp: "+919800000012" },
      property: {
        name: "Rabdentse Garden Stay (sample)",
        town: "Pelling",
        summary: "Kanchenjunga from your window at sunrise, cardamom fields below.",
        description: "Two rooms facing the range, a small garden with prayer flags, and organic vegetables from the family farm.",
        amenities: ["Kanchenjunga view", "Organic meals", "Wi-Fi", "Garden"],
        houseRules: ["Check-in from 12 pm", "No loud music"],
        distances: [{ sight: "Pemayangtse Monastery", km: 3 }, { sight: "Skywalk", km: 6 }, { sight: "Rabdentse Ruins", km: 4 }],
      },
      rooms: [
        { name: "Sunrise room", capacity: 2, price: 2400 },
        { name: "Garden room", capacity: 3, price: 2900 },
      ],
    },
    {
      partner: { name: "Tashi Ling Homestay (sample)", ownerName: "Tashi Dolma", whatsapp: "+919800000013" },
      property: {
        name: "Tashi Ling Homestay (sample)",
        town: "Gangtok",
        summary: "A quiet lane ten minutes from MG Marg, with a rooftop for evening tea.",
        description: "Tashi runs this four-room home with her daughters. Good base for Nathula and Tsomgo day trips.",
        amenities: ["Rooftop", "Wi-Fi", "Breakfast", "Taxi pickup on request"],
        houseRules: ["No smoking", "Gate closes at 11 pm"],
        distances: [{ sight: "MG Marg", km: 1.5 }, { sight: "Rumtek Monastery", km: 24 }, { sight: "Tsomgo Lake", km: 38 }],
      },
      rooms: [
        { name: "Rooftop room", capacity: 2, price: 2200 },
        { name: "Lane room", capacity: 2, price: 1900 },
      ],
    },
  ];

  const propertyIds: Record<string, mongoose.Types.ObjectId> = {};
  for (const s of stays) {
    const partner = await Partner.create({ type: "homestay", ...s.partner, verificationStatus: "verified", commissionPct: 10 });
    const slug = s.property.name.toLowerCase().replace(/\(sample\)/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + s.property.town.toLowerCase();
    const property = await Property.create({ ...s.property, partnerId: partner._id, slug, type: "homestay", status: "live" });
    propertyIds[s.property.town] = property._id;
    for (const r of s.rooms) {
      const room = await Room.create({ propertyId: property._id, name: r.name, capacity: r.capacity, basePrice: rupeesToPaise(r.price) });
      await Inventory.insertMany(
        Array.from({ length: DAYS }, (_, i) => {
          const date = addDays(today, i);
          const weekend = [5, 6].includes(new Date(date + "T00:00:00Z").getUTCDay());
          return { roomId: room._id, propertyId: property._id, date, price: rupeesToPaise(r.price + (weekend ? 300 : 0)), status: "available" };
        }),
      );
    }
  }

  const packages = [
    {
      slug: "north-sikkim-2n3d",
      title: "North Sikkim 2N/3D",
      region: "North Sikkim",
      summary: "Lachung, Yumthang Valley and Zero Point. Two nights in a Lachung homestay, cab and permit included.",
      durationDays: 3,
      stays: [{ night: 0, propertyId: propertyIds.Lachung }, { night: 1, propertyId: propertyIds.Lachung }],
      vehicleType: "Shared Innova or Xylo",
      price: rupeesToPaise(10500),
      priceUnit: "person",
      minGuests: 1,
      maxGuests: 6,
      permitType: "RAP",
      routes: ["north-sikkim", "lachung"],
      itinerary: [
        { day: 1, title: "Gangtok to Lachung", detail: "Leave Gangtok at 10 am. Stops at Seven Sisters and Bhim Nala falls. Reach Lachung by evening. Dinner at the homestay." },
        { day: 2, title: "Yumthang Valley and Zero Point", detail: "Early start for Yumthang, the valley of flowers. Zero Point if the road is open, at extra cost paid locally. Back to Lachung." },
        { day: 3, title: "Lachung to Gangtok", detail: "Breakfast, then drive back to Gangtok by late afternoon." },
      ],
      inclusions: ["2 nights homestay in Lachung", "Breakfast and dinner", "Cab with Sikkimese driver", "RAP permit filing", "Driver allowance and fuel"],
      exclusions: ["Zero Point extension", "Lunch", "Personal expenses"],
    },
    {
      slug: "nathula-tsomgo-day-trip",
      title: "Nathula and Tsomgo day trip",
      region: "East Sikkim",
      summary: "Tsomgo Lake, Baba Mandir and the Nathula pass in one private cab, at the state-notified fare.",
      durationDays: 1,
      stays: [],
      vehicleType: "Private cab, normal class",
      price: rupeesToPaise(6500),
      priceUnit: "vehicle",
      priceFloorRef: rupeesToPaise(6500),
      minGuests: 1,
      maxGuests: 5,
      permitType: "RAP",
      routes: ["nathula", "tsomgo"],
      itinerary: [{ day: 1, title: "Gangtok, Tsomgo, Baba Mandir, Nathula", detail: "Pickup at 7 am from your Gangtok stay. Nathula is closed on Mondays and Tuesdays. Back by 4 pm." }],
      inclusions: ["Private cab for up to 5 guests", "Sikkimese driver", "Permit filing"],
      exclusions: ["Snow boots and coats on rent", "Meals"],
    },
    {
      slug: "pelling-weekend",
      title: "Pelling weekend",
      region: "West Sikkim",
      summary: "Two slow nights facing Kanchenjunga. Pemayangtse, Rabdentse ruins and the Skywalk. No permit needed.",
      durationDays: 3,
      stays: [{ night: 0, propertyId: propertyIds.Pelling }, { night: 1, propertyId: propertyIds.Pelling }],
      vehicleType: "Private cab",
      price: rupeesToPaise(8200),
      priceUnit: "person",
      minGuests: 2,
      maxGuests: 5,
      permitType: "none",
      routes: ["pelling"],
      itinerary: [
        { day: 1, title: "Gangtok to Pelling", detail: "Five hour drive via Ravangla. Evening at the homestay." },
        { day: 2, title: "Pelling sights", detail: "Pemayangtse Monastery, Rabdentse ruins, Skywalk and Khecheopalri Lake." },
        { day: 3, title: "Sunrise and return", detail: "Kanchenjunga at sunrise from the garden, then back to Gangtok." },
      ],
      inclusions: ["2 nights homestay in Pelling", "Breakfast and dinner", "Private cab", "Sightseeing"],
      exclusions: ["Entry tickets", "Lunch"],
    },
  ];

  for (const p of packages) {
    const pkg = await Package.create({ ...p, operatorId: operator._id, status: "live" });
    const capacity = p.priceUnit === "vehicle" ? 4 : 12;
    await Departure.insertMany(
      Array.from({ length: DAYS - 5 }, (_, i) => ({ packageId: pkg._id, date: addDays(today, i + 2), capacity, seatsLeft: capacity })),
    );
  }

  console.log(`Seeded 1 operator, ${stays.length} homestays, ${packages.length} packages, ${DAYS} days of inventory.`);
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
  });

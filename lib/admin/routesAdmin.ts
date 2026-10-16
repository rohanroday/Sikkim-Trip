/** Route closures (A-10): block sales and tell affected travellers. */
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Booking, Package, RouteStatus, ROUTES, type BookingDoc, type RouteStatusDoc } from "@/lib/db/models";
import { isNightDate, formatNight } from "@/lib/dates";
import { sendTemplate } from "@/lib/whatsapp/client";
import { statusUrl } from "@/lib/booking/notify";
import { ROUTE_LABELS } from "@/lib/routes";
import { audit } from "@/lib/audit";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const closureInput = z.object({
  route: z.enum(ROUTES),
  status: z.enum(["closed", "restricted"]),
  from: z.string().refine(isNightDate),
  to: z.string().refine(isNightDate),
  note: z.string().trim().max(200).default(""),
});

export async function createClosure(raw: unknown, actor: string) {
  await connectDB();
  const input = closureInput.parse(raw);
  if (input.to < input.from) throw new ValidationError("End date is before start date.");
  const c = await RouteStatus.create({ ...input, active: true });
  await audit({ actor, action: "route.closure_created", entity: "route_status", entityId: String(c._id), after: input });
  return c;
}

export async function endClosure(id: string, actor: string) {
  await connectDB();
  await RouteStatus.updateOne({ _id: id }, { active: false });
  await audit({ actor, action: "route.closure_ended", entity: "route_status", entityId: id });
}

/** Paid or confirmed package bookings whose trip overlaps the closure. */
export async function affectedBookings(closure: RouteStatusDoc): Promise<BookingDoc[]> {
  const pkgs = await Package.find({ routes: closure.route }, { _id: 1 }).lean();
  return Booking.find({
    packageId: { $in: pkgs.map((p) => p._id) },
    status: { $in: ["paid", "confirmed"] },
    startDate: { $lte: closure.to },
    endDate: { $gte: closure.from },
  }).lean<BookingDoc[]>();
}

export async function notifyAffected(id: string, actor: string): Promise<number> {
  await connectDB();
  const closure = await RouteStatus.findById(id).lean<RouteStatusDoc>();
  if (!closure) throw new NotFoundError();
  const bookings = await affectedBookings(closure);
  for (const b of bookings) {
    const withToken = await Booking.findById(b._id).select("+accessToken").lean<BookingDoc & { accessToken: string }>();
    if (!withToken) continue;
    await sendTemplate({
      to: b.tourist.phone,
      template: "route_alert",
      bodyParams: [
        b.tourist.name,
        ROUTE_LABELS[closure.route as keyof typeof ROUTE_LABELS] ?? closure.route,
        `${formatNight(closure.from, { weekday: false })} to ${formatNight(closure.to, { weekday: false })}`,
        b.code,
        statusUrl(b.code, withToken.accessToken),
      ],
      bookingId: b._id,
    });
  }
  await audit({ actor, action: "route.affected_notified", entity: "route_status", entityId: id, after: { count: bookings.length } });
  return bookings.length;
}

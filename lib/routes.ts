import type { ClientSession } from "mongoose";
import { RouteStatus, type RouteName, type RouteStatusDoc } from "@/lib/db/models";
import { RouteClosedError } from "@/lib/errors";
import type { NightDate } from "@/lib/dates";

export const ROUTE_LABELS: Record<RouteName, string> = {
  "north-sikkim": "North Sikkim",
  lachen: "Lachen and Gurudongmar",
  lachung: "Lachung and Yumthang",
  nathula: "Nathula",
  tsomgo: "Tsomgo Lake",
  zuluk: "Zuluk",
  pelling: "Pelling",
  gangtok: "Gangtok",
};

/** Closures on any of these routes that overlap [from, to]. */
export async function closuresFor(
  routes: readonly string[],
  from: NightDate,
  to: NightDate,
  session?: ClientSession,
): Promise<RouteStatusDoc[]> {
  if (!routes.length) return [];
  return RouteStatus.find(
    { route: { $in: routes }, active: true, status: "closed", from: { $lte: to }, to: { $gte: from } },
    null,
    { session },
  ).lean<RouteStatusDoc[]>();
}

export async function assertRoutesOpen(routes: readonly string[], from: NightDate, to: NightDate): Promise<void> {
  const closed = await closuresFor(routes, from, to);
  if (closed.length) throw new RouteClosedError(ROUTE_LABELS[closed[0].route as RouteName] ?? closed[0].route);
}

/** Closures and restrictions to show in the site banner (today onwards). */
export async function activeAlerts(today: NightDate): Promise<RouteStatusDoc[]> {
  return RouteStatus.find({ active: true, to: { $gte: today } })
    .sort({ from: 1 })
    .limit(5)
    .lean<RouteStatusDoc[]>();
}

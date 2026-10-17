"use server";
/** Admin server actions. Thin: check admin, call lib/, redirect back with a flash message. */
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { DomainError } from "@/lib/errors";
import {
  addDepartures,
  addRoom,
  createPackage,
  createPartner,
  createProperty,
  editInventory,
  setPackagePhoto,
  setPackageStatus,
  setPartnerVerification,
  setPropertyPhotos,
  setPropertyStatus,
} from "@/server/admin/catalogAdmin";
import { createClosure, endClosure, notifyAffected } from "@/server/admin/routesAdmin";
import { recordPartnerResponse } from "@/server/booking/confirmations";
import { cancelBooking } from "@/server/booking/cancel";
import { sendPermitToOperator, setPermitStatus } from "@/server/permits/permits";
import { formatINR } from "@/lib/money";

type Outcome = string | void | { msg: string; back: string };

async function run(back: string, fn: (actor: string) => Promise<Outcome>): Promise<never> {
  let msg: string;
  try {
    const s = await requireAdmin();
    const out = await fn(`admin:${s.phone}`);
    if (out && typeof out === "object") {
      back = out.back;
      msg = "ok:" + out.msg;
    } else {
      msg = "ok:" + (out ?? "Saved.");
    }
  } catch (err) {
    if (err instanceof ZodError) msg = "err:" + (err.issues[0]?.path.join(".") + ": " + err.issues[0]?.message);
    else if (err instanceof DomainError) msg = "err:" + err.message;
    else {
      console.error(err);
      msg = "err:Something went wrong. Check the server log.";
    }
  }
  redirect(`${back}${back.includes("?") ? "&" : "?"}m=${encodeURIComponent(msg)}`);
}

const obj = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function createPartnerAction(fd: FormData) {
  return run("/admin/partners", async (actor) => {
    const p = await createPartner(obj(fd), actor);
    return `Added ${p.name}. Verify them once documents are checked.`;
  });
}

export async function setPartnerStatusAction(fd: FormData) {
  return run("/admin/partners", (actor) =>
    setPartnerVerification(str(fd, "id"), str(fd, "status") as "pending" | "verified" | "suspended", actor),
  );
}

export async function createPropertyAction(fd: FormData) {
  return run("/admin/stays", async (actor) => {
    const p = await createProperty(obj(fd), actor);
    return { msg: `Added ${p.name}. Now add rooms and open dates.`, back: `/admin/stays/${p._id}` };
  });
}

export async function setPropertyStatusAction(fd: FormData) {
  const id = str(fd, "id");
  return run(`/admin/stays/${id}`, (actor) => setPropertyStatus(id, str(fd, "status") as "draft" | "live" | "paused", actor));
}

export async function addRoomAction(fd: FormData) {
  const id = str(fd, "propertyId");
  return run(`/admin/stays/${id}`, async (actor) => {
    const r = await addRoom(obj(fd), actor);
    return `Added ${r.name}.`;
  });
}

export async function inventoryAction(fd: FormData) {
  const back = `/admin/stays/${str(fd, "propertyId")}`;
  return run(back, async (actor) => {
    const data = obj(fd);
    if (!data.priceRupees) delete data.priceRupees;
    const n = await editInventory(data, actor);
    return `${n} nights updated.`;
  });
}

export async function createPackageAction(fd: FormData) {
  return run("/admin/packages", async (actor) => {
    const data: Record<string, unknown> = { ...obj(fd), routes: fd.getAll("routes").map(String) };
    if (!data.floorRupees) delete data.floorRupees;
    const p = await createPackage(data, actor);
    return `Created ${p.title} as a draft. Add departures, then set it live.`;
  });
}

export async function setPackagePhotoAction(fd: FormData) {
  return run("/admin/packages", async (actor) => {
    await setPackagePhoto(str(fd, "id"), str(fd, "url"), actor);
    return "Trip photo saved.";
  });
}

export async function setPropertyPhotosAction(fd: FormData) {
  const id = str(fd, "id");
  return run(`/admin/stays/${id}`, async (actor) => {
    await setPropertyPhotos(id, str(fd, "photos"), actor);
    return "Photos saved.";
  });
}

export async function setPackageStatusAction(fd: FormData) {
  return run("/admin/packages", (actor) => setPackageStatus(str(fd, "id"), str(fd, "status") as "draft" | "live" | "paused", actor));
}

export async function addDeparturesAction(fd: FormData) {
  return run("/admin/packages", async (actor) => `${await addDepartures(obj(fd), actor)} new dates added.`);
}

export async function partnerResponseAction(fd: FormData) {
  const bookingId = str(fd, "bookingId");
  return run(`/admin/bookings/${bookingId}`, async (actor) => {
    const out = await recordPartnerResponse({
      bookingId,
      partnerId: str(fd, "partnerId"),
      response: str(fd, "response") as "confirm" | "decline",
      actor: `${actor}:on-behalf`,
    });
    return `Recorded (${out}).`;
  });
}

export async function adminCancelAction(fd: FormData) {
  const bookingId = str(fd, "bookingId");
  return run(`/admin/bookings/${bookingId}`, async (actor) => {
    const q = await cancelBooking({ bookingId, actor, reason: str(fd, "reason") || "cancelled by admin", forceFull: fd.get("forceFull") === "on" });
    return `Cancelled. Refund ${formatINR(q.refund)} (${q.refundPct}%).`;
  });
}

export async function sendPermitAction(fd: FormData) {
  return run("/admin/permits", async (actor) => {
    await sendPermitToOperator(str(fd, "id"), actor);
    return "Sent to the operator on WhatsApp.";
  });
}

export async function permitStatusAction(fd: FormData) {
  return run("/admin/permits", async (actor) => {
    await setPermitStatus(str(fd, "id"), str(fd, "status") as "filed" | "approved" | "rejected", str(fd, "note"), actor);
    return "Permit updated and traveller told.";
  });
}

export async function createClosureAction(fd: FormData) {
  return run("/admin/routes", async (actor) => {
    await createClosure(obj(fd), actor);
    return "Closure saved. Sales on this route are paused for those dates. Use Notify to message affected travellers.";
  });
}

export async function endClosureAction(fd: FormData) {
  return run("/admin/routes", (actor) => endClosure(str(fd, "id"), actor));
}

export async function notifyAffectedAction(fd: FormData) {
  return run("/admin/routes", async (actor) => `${await notifyAffected(str(fd, "id"), actor)} travellers messaged.`);
}

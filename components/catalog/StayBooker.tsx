"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { StayDetail } from "@/lib/catalog";
import { formatINR } from "@/lib/money";
import { addDays, formatNight } from "@/lib/dates";

const MAX_NIGHTS = 14;

/** Live availability calendar (T-04) + range picker for one room. */
export default function StayBooker({ slug, rooms, initialDate }: { slug: string; rooms: StayDetail["rooms"]; initialDate: string }) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const room = rooms.find((r) => r.id === roomId);
  const startOk = room?.nights.some((n) => n.date === initialDate && n.status === "available");
  const [checkIn, setCheckIn] = useState(startOk ? initialDate : "");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(Math.min(2, room?.capacity ?? 1));

  const byDate = useMemo(() => new Map(room?.nights.map((n) => [n.date, n]) ?? []), [room]);
  const selectedNights = useMemo(() => {
    if (!checkIn || !checkOut) return [];
    const out: string[] = [];
    for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
    return out;
  }, [checkIn, checkOut]);
  const total = selectedNights.reduce((s, d) => s + (byDate.get(d)?.price ?? 0), 0);

  if (!rooms.length || !room) return <div className="ticket p-6 text-ink-2">Rooms are being set up. Check back soon.</div>;

  const pick = (date: string) => {
    if (!checkIn || checkOut || date <= checkIn) {
      setCheckIn(date);
      setCheckOut("");
      return;
    }
    // Every night between check-in and the picked check-out day must be free.
    for (let d = checkIn; d < date; d = addDays(d, 1)) {
      if (byDate.get(d)?.status !== "available") {
        setCheckIn(date);
        setCheckOut("");
        return;
      }
    }
    if (selectedCount(checkIn, date) > MAX_NIGHTS) return;
    setCheckOut(date);
  };

  const go = () => {
    const q = new URLSearchParams({ kind: "stay", slug, room: roomId, in: checkIn, out: checkOut, guests: String(guests) });
    router.push(`/checkout?${q}`);
  };

  return (
    <div className="ticket p-6">
      <label htmlFor="room" className="label">Room</label>
      <select
        id="room"
        className="field"
        value={roomId}
        onChange={(e) => {
          setRoomId(e.target.value);
          setCheckIn("");
          setCheckOut("");
        }}
      >
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>{r.name}, sleeps {r.capacity}</option>
        ))}
      </select>

      <p className="label mt-5">{!checkIn ? "Tap your check-in night" : !checkOut ? "Now tap your check-out day" : "Your dates"}</p>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Availability for the next 60 days">
        {room.nights.map((n) => {
          const inRange = checkIn && (n.date === checkIn || (checkOut && n.date >= checkIn && n.date <= checkOut));
          const isCheckoutCandidate = checkIn && !checkOut && n.date > checkIn;
          const free = n.status === "available";
          const disabled = !free && !isCheckoutCandidate;
          const day = Number(n.date.slice(8));
          return (
            <button
              key={n.date}
              type="button"
              role="gridcell"
              disabled={disabled}
              onClick={() => pick(n.date)}
              aria-label={`${formatNight(n.date)}: ${free ? `free, ${formatINR(n.price ?? 0)}` : n.status === "taken" ? "taken" : "not open"}`}
              aria-selected={Boolean(inRange)}
              className={`flex aspect-square min-h-10 flex-col items-center justify-center rounded-lg text-[0.8rem] transition-colors ${
                inRange ? "bg-ink text-snow" : free ? "bg-snow hover:bg-panel-2" : "bg-transparent text-ink-2/50 line-through"
              } disabled:cursor-not-allowed`}
            >
              <span className="font-semibold">{day}</span>
              {day === 1 && <span className="text-[0.6rem] uppercase">{formatNight(n.date, { weekday: false }).split(" ")[1]}</span>}
            </button>
          );
        })}
      </div>
      <p className="hint">Crossed-out nights are taken or not open yet.</p>

      <div className="mt-5">
        <label htmlFor="sguests" className="label">Guests</label>
        <select id="sguests" className="field" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
          {Array.from({ length: room.capacity }, (_, i) => i + 1).map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className="ticket-tear mt-6" aria-hidden="true" />
      <div className="mt-5 flex items-baseline justify-between">
        <span className="text-ink-2">
          {selectedNights.length ? `${selectedNights.length} night${selectedNights.length > 1 ? "s" : ""}` : "Total"}
        </span>
        <span className="font-display text-2xl font-extrabold">{selectedNights.length ? formatINR(total) : "–"}</span>
      </div>
      <button type="button" className="btn btn-primary mt-5 w-full" disabled={!selectedNights.length} onClick={go}>
        Continue to book
      </button>
    </div>
  );
}

function selectedCount(a: string, b: string): number {
  let n = 0;
  for (let d = a; d < b; d = addDays(d, 1)) n++;
  return n;
}

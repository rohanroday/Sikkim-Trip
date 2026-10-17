"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { DepartureOption } from "@/server/catalog";
import { formatINR } from "@/lib/money";
import { formatNight } from "@/lib/dates";

export default function PackageBooker(props: {
  slug: string;
  price: number;
  unit: "person" | "vehicle";
  minGuests: number;
  maxGuests: number;
  departures: DepartureOption[];
}) {
  const router = useRouter();
  const open = props.departures.filter((d) => !d.closed && d.seatsLeft > 0);
  const [date, setDate] = useState(open[0]?.date ?? "");
  const [guests, setGuests] = useState(Math.max(2, props.minGuests));
  const dep = props.departures.find((d) => d.date === date);
  const seatLimit = props.unit === "vehicle" ? props.maxGuests : Math.min(props.maxGuests, dep?.seatsLeft ?? props.maxGuests);
  const total = useMemo(() => (props.unit === "vehicle" ? props.price : props.price * guests), [props.price, props.unit, guests]);

  const go = () => {
    const q = new URLSearchParams({ kind: "package", slug: props.slug, date, guests: String(guests) });
    router.push(`/checkout?${q}`);
  };

  return (
    <div className="ticket p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Fixed fare, per {props.unit}</p>
      <p className="mt-1 font-display text-4xl font-extrabold">{formatINR(props.price)}</p>

      {props.departures.length === 0 ? (
        <p className="mt-6 text-ink-2">No dates open right now. Message us and we will add one.</p>
      ) : (
        <>
          <fieldset className="mt-6">
            <legend className="label">Pick a start date</legend>
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {props.departures.map((d) => {
                const disabled = d.closed || d.seatsLeft <= 0;
                const selected = d.date === date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => setDate(d.date)}
                    title={d.closed ? d.closedNote || "Route closed" : undefined}
                    className={`min-h-14 rounded-xl border-[1.5px] px-3 py-2 text-left text-sm transition-colors ${
                      selected ? "border-ink bg-ink text-snow" : "border-line bg-snow hover:border-line-strong"
                    } disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    <span className="block font-semibold">{formatNight(d.date, { weekday: true })}</span>
                    <span className={selected ? "text-snow/75" : "text-ink-2"}>
                      {d.closed ? "Road closed" : d.seatsLeft <= 0 ? "Full" : props.unit === "vehicle" ? `${d.seatsLeft} cab${d.seatsLeft > 1 ? "s" : ""} left` : `${d.seatsLeft} seats left`}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5">
            <label htmlFor="guests" className="label">Guests</label>
            <div className="flex items-center gap-3">
              <button type="button" className="btn btn-ghost w-12 px-0" aria-label="One less guest" onClick={() => setGuests((g) => Math.max(props.minGuests, g - 1))}>−</button>
              <output id="guests" className="min-w-10 text-center font-display text-2xl font-extrabold" aria-live="polite">{guests}</output>
              <button type="button" className="btn btn-ghost w-12 px-0" aria-label="One more guest" onClick={() => setGuests((g) => Math.min(seatLimit, g + 1))}>+</button>
            </div>
          </div>

          <div className="ticket-tear mt-6" aria-hidden="true" />
          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-ink-2">Total, taxes included</span>
            <span className="font-display text-2xl font-extrabold">{formatINR(total)}</span>
          </div>
          <button type="button" className="btn btn-primary mt-5 w-full" disabled={!date || guests > seatLimit} onClick={go}>
            Continue to book
          </button>
          <p className="hint text-center">Rooms are held for 10 minutes while you pay.</p>
        </>
      )}
    </div>
  );
}

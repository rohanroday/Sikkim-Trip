"use client";
/**
 * The one interactive moment: press and hold to stamp the fare. It enacts the
 * site's one idea (a price that is fixed before you travel). Release early and
 * the progress eases back. Reduced motion gets the stamped state at once.
 */
import { useEffect, useRef, useState } from "react";

const HOLD_MS = 1100;

export default function HoldToStamp({ fare, route }: { fare: string; route: string }) {
  const [stamped, setStamped] = useState(false);
  const fillRef = useRef<HTMLSpanElement>(null);
  const progress = useRef(0);
  const holding = useRef(false);
  const raf = useRef<number | null>(null);
  const last = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setStamped(true);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, []);

  const loop = (now: number) => {
    const dt = Math.min(64, now - (last.current || now));
    last.current = now;
    const dir = holding.current ? 1 : -1.6;
    progress.current = Math.min(1, Math.max(0, progress.current + (dir * dt) / HOLD_MS));
    fillRef.current?.style.setProperty("transform", `scaleX(${progress.current.toFixed(3)})`);
    if (progress.current >= 1) {
      setStamped(true);
      raf.current = null;
      return;
    }
    if (progress.current <= 0 && !holding.current) {
      raf.current = null;
      last.current = 0;
      return;
    }
    raf.current = requestAnimationFrame(loop);
  };

  const start = () => {
    if (stamped) return;
    holding.current = true;
    if (raf.current === null) raf.current = requestAnimationFrame(loop);
  };
  const stop = () => {
    holding.current = false;
    if (!stamped && raf.current === null && progress.current > 0) raf.current = requestAnimationFrame(loop);
  };

  return (
    <div className="ticket relative overflow-hidden p-7 sm:p-9">
      <p className="kicker">State-notified fare</p>
      <p className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">{route}</p>
      <p className="mt-6 font-display text-5xl font-extrabold tracking-tight text-ink sm:text-6xl">{fare}</p>
      <p className="mt-2 text-sm text-ink-2">Round trip, normal class. Our Nathula price starts from this fare.</p>

      <div
        aria-hidden={!stamped}
        className="pointer-events-none absolute right-6 top-6 transition-all duration-500"
        style={{
          opacity: stamped ? 1 : 0,
          transform: stamped ? "rotate(-8deg) scale(1)" : "rotate(-16deg) scale(1.6)",
          transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <span className="stamp bg-panel/80 text-base sm:text-lg">Fixed fare</span>
      </div>

      <div className="ticket-tear mt-8" aria-hidden="true" />
      {stamped ? (
        <p className="mt-6 text-[0.95rem] font-medium text-ok" role="status">
          Stamped. This is the price you pay, set before you leave home.
        </p>
      ) : (
        <button
          type="button"
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), start())}
          onKeyUp={stop}
          onContextMenu={(e) => e.preventDefault()}
          className="btn btn-ghost relative mt-6 w-full select-none overflow-hidden touch-none"
        >
          <span
            ref={fillRef}
            aria-hidden="true"
            className="absolute inset-0 origin-left bg-[var(--accent-muted)]"
            style={{ transform: "scaleX(0)" }}
          />
          <span className="relative">Press and hold to stamp the fare</span>
        </button>
      )}
    </div>
  );
}

"use client";
/**
 * Home hero. Two modes, decided live:
 *  - static: the hand-drawn range with a gentle scroll drift (phones, reduced motion, or no video yet)
 *  - scrub:  a scroll-scrubbed video (desktop, once NEXT_PUBLIC_HERO_VIDEO is set)
 * The scrub engine follows the 10k-websites standard: Blob fetch with a watchdog,
 * dt-normalised lerp that rests, gated seeks, delta-gated DOM writes, five live gates.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import MountainScene from "@/components/home/MountainScene";

const GATES = [
  "(max-width: 720px)",
  "(orientation: portrait) and (max-width: 1024px)",
  "(orientation: portrait) and (pointer: coarse)",
  "(orientation: landscape) and (pointer: coarse) and (max-height: 560px)",
  "(prefers-reduced-motion: reduce)",
];

const BANDS: { range: [number, number]; kicker?: string; line: string }[] = [
  { range: [0, 0.3], kicker: "Sikkim, booked properly", line: "The road north starts with a fair price." },
  { range: [0.34, 0.64], line: "Fixed fares. Permits filed by registered Sikkim operators." },
];

const smoothstep = (p: number, e0: number, e1: number) => {
  const t = Math.min(1, Math.max(0, (p - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function HeroCopy({ settle = false }: { settle?: boolean }) {
  return (
    <div className={settle ? "hero-settle" : ""}>
      <p className="kicker mb-4">North Sikkim · Nathula · Pelling</p>
      <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl" style={{ maxWidth: "13ch" }}>
        One fixed price. Permits handled.
      </h1>
      <p className="mt-5 text-lg text-ink-2 sm:text-xl" style={{ maxWidth: "36ch" }}>
        See which homestays are free tonight, book the whole trip online, and pay the same price we show. No haggling at the taxi stand.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/packages" className="btn btn-primary">See the trips</Link>
        <Link href="/stays" className="btn btn-ghost bg-snow/70">Find a homestay</Link>
      </div>
    </div>
  );
}

export default function Hero({ videoUrl }: { videoUrl: string }) {
  const [mode, setMode] = useState<"static" | "scrub">("static");
  const sceneRef = useRef<HTMLDivElement>(null);

  // Decide the mode live, on every gate change.
  useEffect(() => {
    if (!videoUrl) return;
    const mqls = GATES.map((q) => window.matchMedia(q));
    const apply = () => setMode(mqls.some((m) => m.matches) ? "static" : "scrub");
    mqls.forEach((m) => m.addEventListener("change", apply));
    apply();
    return () => mqls.forEach((m) => m.removeEventListener("change", apply));
  }, [videoUrl]);

  // Static mode: drift the ridge layers a little as the page scrolls. Rests when idle.
  useEffect(() => {
    if (mode !== "static") return;
    const root = sceneRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layers = Array.from(root.querySelectorAll<SVGGElement>("[data-depth]"));
    let raf: number | null = null;
    let last = -1;
    const tick = () => {
      raf = null;
      const y = Math.min(window.scrollY, window.innerHeight);
      if (y === last) return;
      last = y;
      for (const l of layers) l.style.transform = `translate3d(0, ${(-y * Number(l.dataset.depth)).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [mode]);

  if (mode === "scrub") return <ScrubStage videoUrl={videoUrl} />;

  return (
    <section className="relative isolate flex min-h-[92svh] items-start overflow-hidden">
      <div ref={sceneRef} className="absolute inset-0 -z-10">
        <MountainScene className="h-full w-full" />
      </div>
      {/* Soft light scrim so ink text stays readable wherever the ridges land. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 70% 60% at 20% 25%, rgba(238,242,239,.85) 0%, rgba(238,242,239,.5) 45%, rgba(238,242,239,0) 75%)" }}
      />
      <div className="mx-auto w-full max-w-6xl px-4 pt-28 pb-40 sm:px-6 sm:pt-36">
        <HeroCopy />
      </div>
    </section>
  );
}

/** Desktop scroll-scrub stage. Only mounted when a video exists and no gate matches. */
function ScrubStage({ videoUrl }: { videoUrl: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ringRef = useRef<SVGSVGElement>(null);
  const bandRefs = useRef<(HTMLDivElement | null)[]>([]);
  const settleRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const section = sectionRef.current!;
    const video = videoRef.current!;
    let target = 0;
    let shown = 0;
    let rafId: number | null = null;
    let lastTick = 0;
    let onScreen = true;
    let seekBusy = false;
    let pending: number | null = null;
    const cache = new Map<Element, string>();

    const progress = () => {
      const rect = section.getBoundingClientRect();
      const range = section.offsetHeight - window.innerHeight;
      return range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
    };
    const write = (el: Element | null, prop: string, value: string) => {
      if (!el) return;
      const k = prop;
      const keyed = `${k}:${value}`;
      if (cache.get(el) === keyed) return;
      cache.set(el, keyed);
      (el as HTMLElement).style.setProperty(prop, value);
    };
    const requestSeek = (t: number) => {
      if (!video.duration || Number.isNaN(t)) return;
      if (seekBusy) {
        pending = t;
        return;
      }
      seekBusy = true;
      video.currentTime = t;
    };
    const onSeeked = () => {
      seekBusy = false;
      if (pending !== null) {
        const t = pending;
        pending = null;
        requestSeek(t);
      }
    };
    const onError = () => {
      seekBusy = false;
      pending = null;
      setFailed(true);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);

    const updateCaptions = (p: number) => {
      BANDS.forEach((b, i) => {
        const [a, z] = b.range;
        const f = Math.min(0.02, (z - a) / 3);
        const fadeIn = i === 0 ? 1 : smoothstep(p, a, a + f);
        const op = fadeIn * (1 - smoothstep(p, z - f, z));
        const k = Math.min(1, Math.max(0, (p - a) / Math.min(0.025, (z - a) * 0.35)));
        write(bandRefs.current[i], "opacity", op.toFixed(3));
        write(bandRefs.current[i], "--k", (i === 0 ? 1 : k).toFixed(2));
      });
      const s = smoothstep(p, 0.7, 0.74);
      write(settleRef.current, "opacity", s.toFixed(3));
    };

    const tick = (now: number) => {
      const dt = Math.min(100, now - (lastTick || now));
      lastTick = now;
      shown += (target - shown) * (1 - Math.pow(1 - 0.16, dt / 16.667));
      if (Math.abs(target - shown) < 0.0005) {
        shown = target;
        rafId = null;
        lastTick = 0;
      } else {
        rafId = requestAnimationFrame(tick);
      }
      requestSeek(shown * (video.duration || 0));
      updateCaptions(shown);
    };
    const onScroll = () => {
      target = progress();
      if (rafId === null && onScreen) rafId = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
    });
    io.observe(section);

    // Blob fetch with a progress ring and a 20s no-progress watchdog.
    const ctrl = new AbortController();
    let watchdog = window.setTimeout(() => ctrl.abort(), 20_000);
    let objectUrl = "";
    (async () => {
      try {
        const res = await fetch(videoUrl, { signal: ctrl.signal });
        if (!res.ok || !res.body) throw new Error("video fetch failed");
        const total = Number(res.headers.get("Content-Length")) || 0;
        const reader = res.body.getReader();
        const chunks: BlobPart[] = [];
        let got = 0;
        let lastRing = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          window.clearTimeout(watchdog);
          watchdog = window.setTimeout(() => ctrl.abort(), 20_000);
          chunks.push(value);
          got += value.length;
          const now = performance.now();
          if (total && (now - lastRing > 100 || got >= total)) {
            lastRing = now;
            ringRef.current?.style.setProperty("--ld", String(Math.round(126 * (1 - Math.min(1, got / total)))));
          }
        }
        window.clearTimeout(watchdog);
        objectUrl = URL.createObjectURL(new Blob(chunks, { type: "video/mp4" }));
        video.src = objectUrl;
        video.load();
        video.addEventListener(
          "canplay",
          () => {
            setReady(true);
            onScroll();
          },
          { once: true },
        );
      } catch {
        setFailed(true);
      }
    })();

    window.addEventListener("scroll", onScroll, { passive: true });
    updateCaptions(0);
    return () => {
      ctrl.abort();
      window.clearTimeout(watchdog);
      window.removeEventListener("scroll", onScroll);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      io.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoUrl]);

  return (
    <section ref={sectionRef} className="relative" style={{ height: "400vh" }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <MountainScene className="absolute inset-0 h-full w-full" />
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{ opacity: ready && !failed ? 1 : 0, transform: "translateZ(0)" }}
          muted
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 120% 90% at 50% 45%, rgba(10,18,14,0) 35%, rgba(10,18,14,.55) 100%)" }}
        />
        {BANDS.map((b, i) => (
          <div
            key={i}
            ref={(el) => {
              bandRefs.current[i] = el;
            }}
            className="absolute left-[6vw] top-[22vh] max-w-xl text-snow"
            style={{ opacity: i === 0 ? 1 : 0, textShadow: "var(--tshadow)" }}
          >
            {b.kicker && <p className="kicker mb-3 !text-snow/90">{b.kicker}</p>}
            <p className="font-display text-5xl font-extrabold leading-[1.05]" style={{ transform: "translateY(calc((1 - var(--k, 1)) * 24px))" }}>
              {b.line}
            </p>
          </div>
        ))}
        <div ref={settleRef} className="absolute inset-x-0 top-[16vh] mx-auto max-w-6xl px-6" style={{ opacity: 0 }}>
          <div className="max-w-2xl rounded-3xl bg-canvas/85 p-8 backdrop-blur">
            <HeroCopy settle />
          </div>
        </div>
        {!ready && !failed && (
          <svg ref={ringRef} className="absolute bottom-8 left-1/2 h-12 w-12 -translate-x-1/2 text-snow" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="126" style={{ strokeDashoffset: "var(--ld,126)" }} />
          </svg>
        )}
      </div>
    </section>
  );
}

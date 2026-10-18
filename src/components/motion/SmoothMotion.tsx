"use client";
/**
 * Smooth scrolling (Lenis) and scroll animations (GSAP) for the public site.
 * Pages opt in with data attributes, so they stay server components:
 *   data-hero / data-hero-media / data-hero-parallax / data-hero-content
 *   data-hero-word   one word of the hero headline (rises out of a mask)
 *   data-hero-item   fades up in the hero intro sequence
 *   data-reveal      fades up when scrolled into view
 *   data-reveal-stagger  each child fades up as it enters the screen (batched)
 *   data-parallax    drifts slightly inside its clipped frame while scrolling
 *   data-stamp       drops in like a rubber stamp
 *   data-accordion   on <details>: the answer fades in when opened
 * The header (.site-header) slides away on scroll down and returns on scroll up.
 * Everything is skipped under prefers-reduced-motion. Only transform and opacity animate.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Hero intro: long, cinematic settle. */
const EASE_HERO = "expo.out";
/** Content reveals: soft and quick, so the page never feels like it is waiting. */
const EASE_REVEAL = "power3.out";

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function SmoothMotion() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  // One Lenis instance for the whole visit, driven by GSAP's ticker so both stay in sync.
  useEffect(() => {
    (window as Window & { __motionReady?: boolean }).__motionReady = true;
    if (reducedMotion()) {
      document.documentElement.classList.remove("motion");
      return;
    }
    // lerp gives a steady, physics-like glide; touch keeps the phone's own scrolling.
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true, syncTouch: false, anchors: { offset: -24 } });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    // Header: hide while reading down, show again on the first scroll up.
    const header = document.querySelector<HTMLElement>(".site-header");
    let hidden = false;
    lenis.on("scroll", ({ scroll, direction }: Lenis) => {
      const menuOpen = header?.querySelector("details[open]");
      const next = !menuOpen && direction === 1 && scroll > 160;
      if (next !== hidden && header) {
        hidden = next;
        header.classList.toggle("is-hidden", hidden);
      }
    });

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      header?.classList.remove("is-hidden");
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Page animations, rebuilt on every route change.
  useEffect(() => {
    if (reducedMotion()) return;
    if (!window.location.hash) lenisRef.current?.scrollTo(0, { immediate: true, force: true });
    document.querySelector(".site-header")?.classList.remove("is-hidden");

    const cleanups: (() => void)[] = [];
    const ctx = gsap.context(() => {
      // Hero intro
      const intro = gsap.timeline({ defaults: { ease: EASE_HERO } });
      const media = document.querySelector("[data-hero-media]");
      if (media) intro.fromTo(media, { scale: 1.12 }, { scale: 1, duration: 2.6 }, 0);
      const words = gsap.utils.toArray<HTMLElement>("[data-hero-word]");
      // y: 0 on both ends stops GSAP folding the CSS pre-state offset into a permanent y.
      if (words.length) intro.fromTo(words, { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.4, stagger: 0.08 }, 0.2);
      const items = gsap.utils.toArray<HTMLElement>("[data-hero-item]");
      if (items.length) intro.fromTo(items, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12 }, 0.55);

      // Hero on scroll: the photo sinks slowly, the words lift and soften.
      const hero = document.querySelector("[data-hero]");
      if (hero) {
        gsap.to("[data-hero-parallax]", { yPercent: 12, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 } });
        gsap.to("[data-hero-content]", { y: -50, autoAlpha: 0, ease: "none", scrollTrigger: { trigger: hero, start: "15% top", end: "75% top", scrub: 0.6 } });
      }

      // Single blocks (headings, panels): one soft rise each.
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(el, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 1, ease: EASE_REVEAL, scrollTrigger: { trigger: el, start: "top 90%", once: true } });
      });

      // Cards: each one reveals as it enters; cards entering together cascade gently.
      const cards = gsap.utils.toArray<HTMLElement>("[data-reveal-stagger] > *");
      if (cards.length) {
        gsap.set(cards, { autoAlpha: 0, y: 36 });
        ScrollTrigger.batch(cards, {
          start: "top 92%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.95, ease: EASE_REVEAL, stagger: 0.09, overwrite: true }),
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        gsap.fromTo(el, { yPercent: -5 }, { yPercent: 5, ease: "none", scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: 0.6 } });
      });

      gsap.utils.toArray<HTMLElement>("[data-stamp]").forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, scale: 2.2, rotate: -22 },
          { autoAlpha: 1, scale: 1, rotate: -6, duration: 0.7, ease: "back.out(2.2)", scrollTrigger: { trigger: el, start: "top 85%", once: true } },
        );
      });

      // FAQ: fade the answer in instead of snapping open.
      document.querySelectorAll<HTMLDetailsElement>("details[data-accordion]").forEach((d) => {
        const onToggle = () => {
          const body = d.querySelector(":scope > :not(summary)");
          if (d.open && body) gsap.fromTo(body, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" });
        };
        d.addEventListener("toggle", onToggle);
        cleanups.push(() => d.removeEventListener("toggle", onToggle));
      });
    });

    // Fonts and images change heights after first paint; re-measure once they settle.
    const refresh = () => {
      ScrollTrigger.refresh();
      lenisRef.current?.resize();
    };
    window.addEventListener("load", refresh);
    const t = window.setTimeout(refresh, 600);
    return () => {
      window.removeEventListener("load", refresh);
      window.clearTimeout(t);
      cleanups.forEach((c) => c());
      ctx.revert();
    };
  }, [pathname]);

  return null;
}

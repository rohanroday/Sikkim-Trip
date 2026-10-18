"use client";
/**
 * Smooth scrolling (Lenis) and scroll animations (GSAP) for the public site.
 * Pages opt in with data attributes, so they stay server components:
 *   data-hero / data-hero-media / data-hero-parallax / data-hero-content
 *   data-hero-word   one word of the hero headline (rises out of a mask)
 *   data-hero-item   fades up in the hero intro sequence
 *   data-reveal      fades up when scrolled into view
 *   data-reveal-stagger  its children fade up one after another
 *   data-parallax    drifts slightly inside its clipped frame while scrolling
 *   data-stamp       drops in like a rubber stamp
 * Everything is skipped under prefers-reduced-motion. Only transform and opacity animate.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const EASE = "expo.out";

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
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), anchors: { offset: -80 } });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Page animations, rebuilt on every route change.
  useEffect(() => {
    if (reducedMotion()) return;
    if (!window.location.hash) lenisRef.current?.scrollTo(0, { immediate: true, force: true });

    const ctx = gsap.context(() => {
      // Hero intro
      const intro = gsap.timeline({ defaults: { ease: EASE } });
      const media = document.querySelector("[data-hero-media]");
      if (media) intro.fromTo(media, { scale: 1.14 }, { scale: 1, duration: 2.4 }, 0);
      const words = gsap.utils.toArray<HTMLElement>("[data-hero-word]");
      if (words.length) intro.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 1.3, stagger: 0.07 }, 0.15);
      const items = gsap.utils.toArray<HTMLElement>("[data-hero-item]");
      if (items.length) intro.fromTo(items, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.12 }, 0.45);

      // Hero on scroll: the photo sinks slowly, the words lift away.
      const hero = document.querySelector("[data-hero]");
      if (hero) {
        const scrub = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
        gsap.to("[data-hero-parallax]", { yPercent: 14, ease: "none", scrollTrigger: scrub });
        gsap.to("[data-hero-content]", { y: -70, autoAlpha: 0, ease: "none", scrollTrigger: { ...scrub, end: "80% top" } });
      }

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(el, { autoAlpha: 0, y: 44 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal-stagger]").forEach((el) => {
        gsap.fromTo(el.children, { autoAlpha: 0, y: 56 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE, stagger: 0.11, scrollTrigger: { trigger: el, start: "top 86%", once: true } });
      });

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        gsap.fromTo(el, { yPercent: -5 }, { yPercent: 5, ease: "none", scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true } });
      });

      gsap.utils.toArray<HTMLElement>("[data-stamp]").forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, scale: 2.4, rotate: -24 },
          { autoAlpha: 1, scale: 1, rotate: -6, duration: 0.75, ease: "back.out(2)", scrollTrigger: { trigger: el, start: "top 82%", once: true } },
        );
      });
    });

    // Fonts and images change heights after first paint; re-measure once they settle.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const t = window.setTimeout(refresh, 600);
    return () => {
      window.removeEventListener("load", refresh);
      window.clearTimeout(t);
      ctx.revert();
    };
  }, [pathname]);

  return null;
}

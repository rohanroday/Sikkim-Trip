import Link from "next/link";
import MountainScene from "@/components/home/MountainScene";
import Photo from "@/components/ui/Photo";

const HEADLINE = "One fixed price. Permits handled.";

/** Plain HTML so `muted` is in the server markup; browsers only autoplay muted video. */
function videoMarkup(src: string, poster: string): string {
  const esc = (s: string) => s.replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c]!);
  return `<video class="hero-video absolute inset-0 h-full w-full object-cover" src="${esc(src)}" poster="${esc(poster)}" autoplay muted loop playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video>`;
}

/**
 * Home hero. Your photo (NEXT_PUBLIC_HERO_IMAGE) with an optional muted loop
 * (NEXT_PUBLIC_HERO_VIDEO) on top, otherwise the drawn Kanchenjunga range.
 * Motion (see SmoothMotion): the photo settles from a slow zoom, the headline
 * rises word by word, and on scroll the photo sinks while the words lift away.
 */
export default function Hero({ image, video = "" }: { image: string; video?: string }) {
  const onPhoto = Boolean(image);
  return (
    <section className="mx-auto max-w-7xl px-3 pt-3 sm:px-5 sm:pt-5">
      <div data-hero className="relative isolate flex min-h-[560px] items-end overflow-hidden rounded-[32px] sm:min-h-[calc(100svh-120px)] sm:max-h-[760px]">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div data-hero-parallax className="absolute inset-x-0 -bottom-[8%] -top-[8%]">
            <div data-hero-media className="absolute inset-0 will-change-transform">
              {onPhoto ? (
                <>
                  <Photo src={image} alt="" priority sizes="(max-width: 1280px) 100vw, 1280px" />
                  {video && <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: videoMarkup(video, image) }} />}
                </>
              ) : (
                <MountainScene className="h-full w-full" />
              )}
            </div>
          </div>
          <div
            aria-hidden="true"
            className={`absolute inset-0 ${
              onPhoto ? "bg-gradient-to-t from-[#0c1a15]/90 via-[#0c1a15]/35 to-[#0c1a15]/5" : "bg-gradient-to-t from-canvas/95 via-canvas/40 to-transparent"
            }`}
          />
        </div>

        <div data-hero-content className={`w-full p-6 pb-24 sm:p-12 sm:pb-28 ${onPhoto ? "text-snow" : "text-ink"}`}>
          <p data-hero-item className={`kicker mb-4 ${onPhoto ? "!text-snow/80" : ""}`}>North Sikkim · Nathula · Pelling</p>
          <h1 className="font-display text-[2.7rem] font-extrabold leading-[1.02] tracking-[-0.02em] sm:text-7xl" style={{ maxWidth: "13ch" }}>
            {HEADLINE.split(" ").map((w, i) => (
              <span key={i}>
                <span className="word-mask">
                  <span data-hero-word>{w}</span>
                </span>{" "}
              </span>
            ))}
          </h1>
          <p data-hero-item className={`mt-5 text-lg sm:text-xl ${onPhoto ? "text-snow/90" : "text-ink-2"}`} style={{ maxWidth: "40ch" }}>
            Book your Sikkim trip with stays you can see are free, at a price that does not change when you arrive.
          </p>
          <div data-hero-item className="mt-8 flex flex-wrap gap-3">
            <Link href="/packages" className="btn btn-primary">See the trips</Link>
            <Link href="/stays" className={`btn ${onPhoto ? "btn-light" : "btn-ghost bg-snow/70"}`}>Find a homestay</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

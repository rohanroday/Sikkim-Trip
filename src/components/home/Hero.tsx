import Link from "next/link";
import MountainScene from "@/components/home/MountainScene";
import Photo from "@/components/ui/Photo";

/**
 * Home hero. Shows your photo when NEXT_PUBLIC_HERO_IMAGE is set (with an optional
 * short muted loop from NEXT_PUBLIC_HERO_VIDEO on top), otherwise the drawn
 * Kanchenjunga range. Reduced-motion visitors see the still photo only.
 */
/** Plain HTML so `muted` is in the server markup; browsers only autoplay muted video. */
function videoMarkup(src: string, poster: string): string {
  const esc = (s: string) => s.replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c]!);
  return `<video class="hero-video absolute inset-0 h-full w-full object-cover" src="${esc(src)}" poster="${esc(poster)}" autoplay muted loop playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video>`;
}

export default function Hero({ image, video = "" }: { image: string; video?: string }) {
  const onPhoto = Boolean(image);
  return (
    <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="relative isolate flex min-h-[520px] items-end overflow-hidden rounded-[28px] sm:min-h-[580px]">
        <div className="absolute inset-0 -z-10">
          {onPhoto ? (
            <>
              <Photo src={image} alt="" priority sizes="(max-width: 1200px) 100vw, 1152px" />
              {video && <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: videoMarkup(video, image) }} />}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0c1a15]/85 via-[#0c1a15]/35 to-[#0c1a15]/10" />
            </>
          ) : (
            <>
              <MountainScene className="h-full w-full" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-canvas/95 via-canvas/40 to-transparent" />
            </>
          )}
        </div>

        <div className={`w-full p-6 pb-20 sm:p-10 sm:pb-24 ${onPhoto ? "text-snow" : "text-ink"}`}>
          <p className={`kicker mb-3 ${onPhoto ? "!text-snow/80" : ""}`}>North Sikkim · Nathula · Pelling</p>
          <h1 className="font-display text-[2.4rem] font-extrabold leading-[1.04] tracking-tight sm:text-6xl" style={{ maxWidth: "14ch" }}>
            One fixed price. Permits handled.
          </h1>
          <p className={`mt-4 text-lg sm:text-xl ${onPhoto ? "text-snow/90" : "text-ink-2"}`} style={{ maxWidth: "40ch" }}>
            Book your Sikkim trip with stays you can see are free, at a price that does not change when you arrive.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/packages" className="btn btn-primary">See the trips</Link>
            <Link href="/stays" className={`btn ${onPhoto ? "btn-light" : "btn-ghost bg-snow/70"}`}>Find a homestay</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

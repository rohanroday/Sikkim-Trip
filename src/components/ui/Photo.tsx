import Image from "next/image";

/** Hosts Next.js can resize and compress (see next.config.ts). Anything else is shown as-is. */
const OPTIMIZABLE = /^https:\/\/[a-z0-9-]+\.googleusercontent\.com\//i;

/**
 * A photo that fills its parent (the parent needs `relative` and a size, e.g. an aspect ratio).
 * Local files (/images/...) and Google Photos links are resized and compressed for phones.
 */
export default function Photo({
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (src.startsWith("/") || OPTIMIZABLE.test(src)) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- unknown host, so it can't go through the image optimizer
    <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} className={`absolute inset-0 h-full w-full object-cover ${className}`} />
  );
}

import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { connectDB } from "@/lib/db/connect";
import { Package, Property } from "@/lib/db/models";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const fixed = ["", "/packages", "/stays", "/cancellation-policy", "/privacy", "/terms"].map((p) => ({ url: `${base}${p}` }));
  try {
    await connectDB();
    const [pkgs, props] = await Promise.all([
      Package.find({ status: "live" }, { slug: 1, updatedAt: 1 }).lean(),
      Property.find({ status: "live" }, { slug: 1, updatedAt: 1 }).lean(),
    ]);
    return [
      ...fixed,
      ...pkgs.map((p) => ({ url: `${base}/packages/${p.slug}`, lastModified: p.updatedAt })),
      ...props.map((p) => ({ url: `${base}/stays/${p.slug}`, lastModified: p.updatedAt })),
    ];
  } catch {
    return fixed;
  }
}

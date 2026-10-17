import type { MetadataRoute } from "next";
import { env } from "@/server/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/booking", "/checkout"] }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}

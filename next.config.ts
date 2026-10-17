import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["mongoose"],
  images: {
    formats: ["image/avif", "image/webp"],
    // Photos from Google Photos / Google Drive share links. Local files in public/images need no entry.
    remotePatterns: [{ protocol: "https", hostname: "**.googleusercontent.com" }],
  },
};

export default nextConfig;

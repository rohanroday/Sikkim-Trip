import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { env } from "@/server/env";
import VisibilityPause from "@/components/ui/VisibilityPause";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-bricolage", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-figtree", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: `${site.name}: ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { type: "website", siteName: site.name, locale: "en_IN" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#14251f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${bricolage.variable} ${figtree.variable} ${jetbrains.variable}`}>
      <body>
        <div className="env-mist" aria-hidden="true" />
        <VisibilityPause />
        {children}
      </body>
    </html>
  );
}

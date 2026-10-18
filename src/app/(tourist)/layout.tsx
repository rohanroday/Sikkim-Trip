import { RouteBanner, SiteFooter, SiteNav, TestModeBanner } from "@/components/layout/SiteChrome";
import SmoothMotion from "@/components/motion/SmoothMotion";

export default function TouristLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <SmoothMotion />
      <TestModeBanner />
      <RouteBanner />
      <div className="relative">
        <SiteNav />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </div>
      <SiteFooter />
    </>
  );
}

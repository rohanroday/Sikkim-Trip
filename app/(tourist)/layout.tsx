import { RouteBanner, SiteFooter, SiteNav } from "@/components/layout/SiteChrome";

export default function TouristLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
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

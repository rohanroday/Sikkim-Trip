import type { Metadata } from "next";
import FareTicket from "@/components/catalog/FareTicket";
import { listLivePackages } from "@/server/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sikkim trip packages at fixed prices",
  description: "North Sikkim 2N/3D, Nathula day trip and Pelling weekend at fixed, published prices. Permits filed by registered operators.",
};

export default async function PackagesPage() {
  const packages = await listLivePackages();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <p className="kicker">All trips</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ maxWidth: "20ch" }}>
        Sikkim trips with one fixed price.
      </h1>
      <p className="mt-4 text-lg text-ink-2" style={{ maxWidth: "54ch" }}>
        Each price covers the stays, the cab and driver, and the permit filing where needed. Pick a trip to see dates and seats left.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => (
          <FareTicket key={p.slug} pkg={p} />
        ))}
      </div>
      {packages.length === 0 && <p className="mt-10 text-ink-2">New dates are being added. Check back soon.</p>}
    </div>
  );
}

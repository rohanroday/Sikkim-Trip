import type { Metadata } from "next";
import LegalPage from "@/components/layout/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms" };

// DRAFT: seller-of-record and GST wording depend on PRD §14 Q3 (CA advice). Needs legal review.
export default function Terms() {
  return (
    <LegalPage title="Terms">
      <h2>Who you are booking with</h2>
      <p>{site.name} is a booking platform. Stays are provided by the homestay or hotel named on your booking. Trips that need a permit are run by the Sikkim-registered tour operator named on the trip page, who is the seller of the trip.</p>
      <h2>Prices</h2>
      <p>The price shown before you pay is the full price for everything listed as included. Prices include taxes.</p>
      <h2>Permits</h2>
      <p>Permits are issued by the Government of Sikkim. The operator applies on your behalf. We cannot guarantee approval, and the state may close routes at short notice for weather or security.</p>
      <h2>Your part</h2>
      <p>Give correct guest details and valid IDs, carry the same IDs on the trip, and follow your host&apos;s house rules and the driver&apos;s safety advice on mountain roads.</p>
    </LegalPage>
  );
}

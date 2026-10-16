import type { Metadata } from "next";
import { CANCELLATION_TIERS } from "@/lib/booking/cancel";
import LegalPage from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Cancellation and refunds" };

// DRAFT: tiers are the PRD §14 proposal. Needs Rohan's sign-off and legal review before launch.
export default function CancellationPolicy() {
  return (
    <LegalPage title="Cancellation and refunds">
      <p>You can cancel from your booking page at any time before the trip. The refund depends on how many days before the start date you cancel:</p>
      <table>
        <thead><tr><th>When you cancel</th><th>Refund</th></tr></thead>
        <tbody>
          {CANCELLATION_TIERS.map((t) => (
            <tr key={t.label}><td>{t.label}</td><td>{t.refundPct}%</td></tr>
          ))}
        </tbody>
      </table>
      <h2>Road closures</h2>
      <p>If the state closes your route on your dates, you can move to another route, pick a new date, or take a full refund. This applies whatever the date.</p>
      <h2>If a host cannot take you</h2>
      <p>If a homestay or operator declines your booking, we find you an equal or better option. If we cannot, you get a full refund.</p>
      <h2>How refunds reach you</h2>
      <p>Refunds go back to the card, UPI or bank account you paid from. They usually arrive in 5 to 7 working days.</p>
    </LegalPage>
  );
}

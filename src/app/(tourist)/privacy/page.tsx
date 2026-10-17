import type { Metadata } from "next";
import LegalPage from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Privacy and your IDs" };

// DRAFT: written to the DPDP Act 2023 principles in PRD §10.3. Needs legal review before launch.
export default function Privacy() {
  return (
    <LegalPage title="Privacy and your IDs">
      <h2>What we collect</h2>
      <p>Your name, WhatsApp number and email to run your booking. For permit trips, each guest&apos;s name, age, gender, nationality, ID type and a photo of the ID, because the state asks for them.</p>
      <h2>Why</h2>
      <p>To confirm your booking with hosts, send you updates, and let the registered operator apply for your permit. Nothing else. We do not sell your data.</p>
      <h2>Who sees it</h2>
      <p>Your hosts see your name and dates. They see your phone number only after they confirm your booking. Only the operator on your trip and our team can open ID photos, through links that expire within minutes.</p>
      <h2>How long we keep it</h2>
      <p>ID photos are deleted automatically 7 days after your trip ends. We keep only the last 4 characters of each ID number. Booking records are kept as tax law requires.</p>
      <h2>Payments</h2>
      <p>Payments are handled by Razorpay. We never see or store card or bank details.</p>
      <h2>Your rights</h2>
      <p>You can ask us to show, correct or delete your data at any time. Message us on WhatsApp and we will reply within 7 days.</p>
    </LegalPage>
  );
}

/**
 * Approved WhatsApp templates (PRD §6.4). The body text below is what must be
 * submitted to Meta for approval; {{n}} placeholders map to bodyParams in order.
 * Keep this file and the approved templates in sync.
 */
export const TEMPLATES = {
  otp_code: {
    category: "AUTHENTICATION",
    body: "{{1}} is your verification code. For your security, do not share this code.",
    buttons: ["URL copy-code"],
  },
  booking_received: {
    category: "UTILITY",
    body: "Hi {{1}}, we got your payment of {{2}} for {{3}} on {{4}}. Booking code {{5}}. We are confirming with your hosts now. Track it here: {{6}}",
  },
  booking_request: {
    category: "UTILITY",
    body: "New booking {{1}}: {{2}} for {{3}} guests, {{4}}. Your payout: {{5}}. Please confirm within 2 hours.",
    buttons: ["Confirm", "Decline"],
  },
  booking_confirmed: {
    category: "UTILITY",
    body: "Good news {{1}}, booking {{2}} is confirmed by all your hosts. Trip starts {{3}}. Details: {{4}}",
  },
  documents_needed: {
    category: "UTILITY",
    body: "Hi {{1}}, your trip {{2}} needs a permit. Please add ID details for all {{3}} guests by {{4}}: {{5}}",
  },
  permit_request: {
    category: "UTILITY",
    body: "Permit request for booking {{1}}: {{2}} permit, travel date {{3}}, {{4}} guests. Guest list and IDs are ready for filing.",
  },
  permit_status: {
    category: "UTILITY",
    body: "Hi {{1}}, the {{2}} permit for booking {{3}} is now {{4}}. {{5}}",
  },
  driver_assigned: {
    category: "UTILITY",
    body: "Hi {{1}}, your driver for booking {{2}} is {{3}}, vehicle {{4}}. Phone: {{5}}",
  },
  trip_reminder: {
    category: "UTILITY",
    body: "Reminder: booking {{1}} starts tomorrow, {{2}}. {{3}}",
  },
  route_alert: {
    category: "UTILITY",
    body: "Hi {{1}}, the {{2}} route is closed for {{3}}. This affects booking {{4}}. Choose a new route, new date, or full refund here: {{5}}",
  },
  booking_cancelled: {
    category: "UTILITY",
    body: "Booking {{1}} is cancelled. Refund: {{2}}. It usually reaches your account in 5 to 7 working days.",
  },
  refund_processed: {
    category: "UTILITY",
    body: "Your refund of {{1}} for booking {{2}} has been sent.",
  },
  payout_sent: {
    category: "UTILITY",
    body: "Payout of {{1}} for booking {{2}} has been sent. UTR {{3}}.",
  },
  review_request: {
    category: "MARKETING",
    body: "Hi {{1}}, how was your trip? Tell us in one minute: {{2}}",
  },
  escalation: {
    category: "UTILITY",
    body: "Action needed on booking {{1}}: {{2}}",
  },
} as const;

export type TemplateName = keyof typeof TEMPLATES;

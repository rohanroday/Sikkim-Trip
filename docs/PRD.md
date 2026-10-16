# PRD — Sikkim Trip Platform

| | |
|---|---|
| **Owner** | Rohan (rohanroday@gmail.com) |
| **Status** | Draft v1.0 |
| **Created** | 2026-10-16 |
| **Source** | *Sikkim Trip Platform — Business & Build Plan* (2026-10-16) |
| **Working name** | Sikkim Trip Platform (brand TBD) |

---

## 1. Summary

Build the booking software that Sikkim's homestays and registered tour operators use, and earn from the trips that flow through it.

- **Tourists** get fixed, published prices for North Sikkim, Nathula and Pelling trips, with live room availability and instant online booking.
- **Partners** (homestays, hotels, registered operators) get a WhatsApp-first tool to receive and confirm bookings, manage their room calendar, and see payouts.
- **Admin** (us) verifies partners, sets package prices, routes permit trips to registered operators, and handles commissions and refunds.

**Business target:** ₹1 crore yearly revenue within 2–3 years from booking commissions (8–12%) plus partner subscriptions (₹999–1,499/month).

**Build principle:** mobile-first website + WhatsApp, not a native app. Sell the first 10 trips by hand before writing much code. Each phase starts only when the previous gate is met.

---

## 2. Problem

Sikkim's demand is not the problem; booking and trust are.

| Fact | Implication for the product |
|---|---|
| Record 17,12,360 tourists in 2025 (up from 16,25,241 in 2024); 1M+ domestic visitors in Jan–May 2026, May peak 2,49,516 | Demand exists and is growing; peaks are sharp (May, Oct–Jan) |
| Nathula, Tsomgo, Lachen, Lachung, Zuluk require RAP/PAP permits; only Sikkim-registered operators and Sikkimese drivers may run these tours; tourists can't apply directly (portal moving online with QR passes) | Every permit trip **must** route through a registered partner operator. We collect guest details/IDs and hand them over; the operator files |
| North Sikkim 2N/3D ≈ ₹8,000–12,000/person incl. stay, transport, meals, permits; Lachen/Lachung usually not bookable separately | Product sells **bundled packages**, not just rooms |
| State committee formed over taxi/permit overcharging; Gangtok–Nathula round trip fixed at ₹6,500 (normal) / ₹7,000 (luxury) | **Fixed, published prices** are the trust hook. Use government-notified fares as baseline |
| New Year 2026: Lachung fully booked; officials told tourists to confirm stays before going north | **Live availability** is the missing piece |
| ~3,160 stays (1,181 hotels, 1,981 homestays), mostly small and offline; 1,000 Mega Homestay Scheme units coming (3 rooms each, ₹50 lakh grant); only 16 Sikkim homestays on NIDHI+ | Large, under-served supply side; new homestays have no booking channel |
| Owners lack digital marketing, struggle with tech and patchy internet; agencies avoided ungraded homestays | Partner tool must be dead simple, WhatsApp-native, low-bandwidth |
| Sikkim hotel association once cut off MakeMyTrip/Goibibo over commissions | Real opening for a **low-commission local option** |
| Homestays must have < 5 rooms and can't be leased out | Owners run them personally; inventory model is small (1–4 rooms) |

---

## 3. Goals, non-goals, success metrics

### 3.1 Goals
1. Tourists can find, price and book a complete Sikkim trip (stay + transport + permits) online in under 5 minutes, with a confirmed price and no hidden add-ons.
2. Zero double-bookings on rooms managed through the platform.
3. Partners can run their bookings from WhatsApp plus one web dashboard link, with no training beyond a 10-minute onboarding.
4. Every permit trip reaches a registered operator with a complete, valid guest list before the permit cut-off.
5. Reach the revenue plan in §11.

### 3.2 Non-goals (for now)
- Native iOS/Android apps (see §9 for the trigger to build one).
- Applying for RAP/PAP permits ourselves or on behalf of tourists.
- Running our own vehicles or employing drivers.
- Flights, trains, or destinations outside Sikkim (Darjeeling/Bengal is a later expansion).
- Storing bank/card details (Razorpay holds them).
- Dynamic/surge pricing for packages — packages are fixed-price by design.

### 3.3 Success metrics

| Metric | Phase 0 target | Year 1 | Year 3 |
|---|---|---|---|
| Paid trips booked | 10 in first 3 weeks | 400 | 2,500 |
| Gross booking value | — | ₹1 crore | ₹6.25 crore |
| Signed partners | 20 homestays + 2–3 operators | 50 paying | 300 paying |
| Double-bookings | 0 | 0 | 0 |
| Partner confirm time (median) | < 2 h | < 30 min | < 15 min |
| Booking conversion (checkout start → paid) | — | ≥ 35% | ≥ 45% |
| Refund/complaint rate | track | < 5% | < 3% |
| Revenue | — | ₹17.2 lakh | ₹1.06 crore |

---

## 4. Users and personas

| Persona | Description | Key needs |
|---|---|---|
| **Tourist (Priya, 29, Kolkata/Delhi/Bengaluru)** | Couple or small family, first visit, finds trips via Google or Instagram, books on phone | Trustworthy fixed price, clear inclusions, live availability, easy UPI payment, simple permit document upload, WhatsApp updates |
| **Homestay owner (Karma, 45, Lachung)** | Runs 2–4 rooms with family, uses WhatsApp all day, patchy network, low tech comfort | Booking alerts on WhatsApp, one-tap confirm, simple calendar, reliable payouts, no app install |
| **Hotel manager (Gangtok/Pelling)** | 10–40 rooms, already on Booking.com/Airbnb | Lower commission, calendar sync with OTAs, payout reports |
| **Registered tour operator** | Sikkim-registered, has drivers and vehicles, files RAP/PAP permits | Complete guest lists and IDs on time, clear trip manifests, predictable payouts |
| **Admin (Rohan + ops staff)** | Runs the platform | Partner verification, pricing control, permit routing, refunds, commission reporting |

---

## 5. Scope by phase (gated roadmap)

> Each phase starts **only** when the gate before it is met. The first gate matters most: if 20 homestays and a few operators won't sell through us on WhatsApp, an app won't fix that.

### Phase 0 — Manual validation (weeks 1–3, no code)
1. Shortlist 40 homestays in Gangtok, Pelling and Lachung from booking sites and the state's registered list.
2. Visit/call; sign 20 who agree to a per-booking commission. Confirm their current OTA commission rates (open question §14).
3. Partner with 2–3 registered operators for North Sikkim and Nathula permits.
4. Price 3 fixed packages: North Sikkim 2N/3D, Nathula day trip, Pelling weekend.
5. Post on Instagram with a WhatsApp booking link; collect payment via Razorpay Payment Links.
6. Track every enquiry, booking and complaint in a Google Sheet (columns become the first schema).

**Gate 0 → 1:** 10 paid bookings, 20 signed homestays, ≥ 2 signed operators, < 2 serious complaints.

### Phase 1 — MVP website + admin (target ~6–8 weeks)
- Tourist website: package pages, homestay pages, availability calendar, Razorpay checkout, guest details + ID upload, booking status page.
- Admin panel: partner onboarding, package pricing, manual inventory entry, permit request routing, bookings list, refunds.
- WhatsApp: template notifications to tourists and partners (booking received, confirmed, documents needed).
- Partner confirm via WhatsApp button (no dashboard yet; admin enters inventory on partners' behalf).

**Gate 1 → 2:** 50 online bookings, ≥ 30 active partners, partners asking to manage their own calendar.

### Phase 2 — Partner tool + subscriptions
- Partner PWA dashboard: room calendar, bookings, payouts, reviews.
- iCal import/export with Airbnb and Booking.com.
- Razorpay Route automated split payouts.
- Partner subscription billing (₹999–1,499/month).
- Reviews after trip completion.

**Gate 2 → 3:** ~1,000 bookings, partners using dashboard daily, demand for push/offline.

### Phase 3 — Scale
- Partner app (React Native) for push alerts and offline use in low-network areas.
- Tourist app only if repeat usage appears (locals, taxis, weekend trips).
- Own operator registration under the Sikkim Tourist Trade Act once bookings are steady.
- Expansion: Zuluk, village stays, winter carnival trips, Darjeeling.

---

## 6. Functional requirements

Priority: **P0** = MVP (Phase 1), **P1** = Phase 2, **P2** = later.

### 6.1 Tourist website

| ID | Requirement | Pri |
|---|---|---|
| T-01 | Home page with search by place (Gangtok, Pelling, Lachung, Lachen, Nathula, Zuluk…) and date range, guest count | P0 |
| T-02 | Package listing and detail pages: itinerary by day, inclusions/exclusions, stays used, vehicle type, permit requirement, fixed price per person and per group, cancellation policy | P0 |
| T-03 | Homestay/hotel pages: photos, rooms, amenities, distance to key sights, house rules, map, reviews (P1) | P0 |
| T-04 | Live availability calendar per room and per package date; unavailable dates disabled | P0 |
| T-05 | Price breakdown before payment (base, taxes/GST, platform fee if any); final price = displayed price, no surprises | P0 |
| T-06 | Checkout: phone number + OTP (guest checkout, no password), lead guest details, Razorpay (UPI, cards, netbanking) | P0 |
| T-07 | 10-minute inventory hold during payment with visible countdown; auto-release on failure/timeout | P0 |
| T-08 | Guest details form for every traveller on permit trips (name, age, gender, nationality, ID type, ID number) and ID image upload; foreign nationals flagged (PAP rules differ) | P0 |
| T-09 | Booking status page (magic link from WhatsApp/SMS): status timeline, itinerary, operator/driver contact once assigned, documents pending | P0 |
| T-10 | Cancellation request from status page; refund amount shown per policy before confirming | P0 |
| T-11 | WhatsApp click-to-chat support button on every page | P0 |
| T-12 | SEO: SSR/SSG pages, schema.org (Product/Offer, LodgingBusiness, TouristTrip), sitemap, fast LCP on 4G; landing pages like "North Sikkim package" | P0 |
| T-13 | Route status banner (e.g. "Lachen closed — landslide"), admin-controlled, blocks sales on closed routes | P0 |
| T-14 | Reviews after completed trip | P1 |
| T-15 | Hindi and Bengali language support | P2 |

### 6.2 Partner tool (WhatsApp + PWA dashboard)

| ID | Requirement | Pri |
|---|---|---|
| P-01 | New-booking alert on WhatsApp with guest name, dates, rooms, amount, payout, and **Confirm / Decline** buttons | P0 |
| P-02 | Auto-escalate to admin if partner doesn't respond within SLA (default 2 h; 30 min for same-week bookings) | P0 |
| P-03 | Login by WhatsApp/SMS OTP to the dashboard; no passwords | P1 |
| P-04 | Room calendar: per room per night, set price, block/unblock, see booked/held nights; bulk edit date ranges | P1 |
| P-05 | iCal import (Airbnb, Booking.com, others) every 15 min → blocks those nights; iCal export feed per room with secret tokenised URL | P1 |
| P-06 | Bookings list: upcoming, in-stay, completed, cancelled; guest contact visible only after confirmation | P1 |
| P-07 | Payout history: per booking gross, commission, fees, net, transfer status, UTR | P1 |
| P-08 | Reviews: view and reply | P1 |
| P-09 | Subscription status and billing | P1 |
| P-10 | Operator view: trip manifests per date, guest lists, ID documents for permit filing, mark permit "filed/approved/rejected", assign driver + vehicle number | P0 (admin-assisted) / P1 (self-serve) |
| P-11 | Installable PWA, works on low-end Android, cached shell for poor network | P1 |
| P-12 | Daily WhatsApp summary: today's check-ins, tomorrow's arrivals | P1 |

### 6.3 Admin panel

| ID | Requirement | Pri |
|---|---|---|
| A-01 | Partner onboarding: type (homestay/hotel/operator), owner, WhatsApp number, documents (registration certificate, homestay registration, operator licence), verification status workflow (pending → verified → suspended) | P0 |
| A-02 | Create Razorpay Route linked account for partner (KYC handled by Razorpay) | P0 (manual) / P1 (API) |
| A-03 | Property and room management on behalf of partners; photo upload | P0 |
| A-04 | Package builder: itinerary, linked operator, linked stays per night, vehicle type, price, capacity, departure dates, permit type (RAP/PAP/none) | P0 |
| A-05 | Pricing control with government-notified fares as floor/reference (e.g. Gangtok–Nathula ₹6,500/₹7,000) | P0 |
| A-06 | Permit routing: send guest list + IDs to operator, track status, deadline alerts | P0 |
| A-07 | Bookings console: search, filter, manual status change with audit note, resend messages | P0 |
| A-08 | Refunds: full/partial via Razorpay, reason codes | P0 |
| A-09 | Commission settings per partner (default 10%, range 8–12%) and per item type | P0 |
| A-10 | Route closures: mark route closed for date range → hides/blocks packages, notifies affected bookings | P0 |
| A-11 | Reports: GBV, commission, payouts, partner response times, cancellations, by month/season | P1 |
| A-12 | Audit log of every admin action on bookings, payouts, partners | P0 |
| A-13 | Roles: owner, ops, support (least privilege) | P1 |

### 6.4 Messaging (WhatsApp Business API)

All outbound business-initiated messages use **approved templates**. Session messages only within the 24-hour customer window.

| Template | To | Trigger |
|---|---|---|
| `booking_received` | Tourist | Payment captured |
| `booking_request` (buttons: Confirm/Decline) | Partner | Payment captured |
| `booking_confirmed` | Tourist | All partners confirmed |
| `documents_needed` | Tourist | Permit trip paid, IDs missing; reminders at T-72h, T-48h |
| `permit_request` | Operator | Guest list complete |
| `permit_status` | Tourist | Operator marks filed/approved/rejected |
| `driver_assigned` | Tourist | Operator assigns driver/vehicle |
| `trip_reminder` | Tourist + partner | T-24h |
| `route_alert` | Tourist | Route closure affecting booking |
| `booking_cancelled` / `refund_processed` | Tourist + partner | Cancellation/refund |
| `payout_sent` | Partner | Transfer settled |
| `review_request` | Tourist | Trip completed + 1 day |
| `escalation` | Admin | Partner SLA missed, payment/permit failure |

SMS fallback for OTP and critical messages if WhatsApp delivery fails.

---

## 7. Key flows

### 7.1 Tourist books a package (permit trip)
1. Lands on package page (Google/Instagram) → picks date and guest count.
2. System checks capacity for package date **and** room-nights for every linked stay.
3. Phone OTP → lead guest details → price breakdown.
4. Booking created as `held`; all room-nights set `held` in one DB transaction with `holdExpiresAt = now + 10 min`.
5. Razorpay order created → tourist pays.
6. Razorpay webhook `payment.captured` (signature verified, idempotent) → booking `paid`, room-nights `booked`.
7. WhatsApp: `booking_received` to tourist; `booking_request` to each partner and the operator.
8. All partners confirm → booking `confirmed`. Any decline → admin finds substitute of equal/higher grade or full refund.
9. Tourist uploads guest IDs → `permit_request` created → operator files on government portal → marks status.
10. Operator assigns driver → tourist notified → trip → `completed` → payout released → review request.

### 7.2 Hold expiry / payment failure
- Background job every minute releases `held` inventory where `holdExpiresAt < now` and booking not paid → booking `expired`.
- Late webhook for an expired hold: re-check availability in a transaction; if still free, book; else auto-refund and notify.

### 7.3 Partner declines or no-shows
- Decline → admin alerted, 2-hour window to rebook equivalent → else full refund + apology credit.
- No response within SLA → escalate to admin, who calls the partner.

### 7.4 Route closure
- Admin marks route closed for dates → affected packages hidden from sale → affected bookings notified with options: alternate route (Nathula/Zuluk/Pelling), reschedule, or full refund (force majeure policy).

### 7.5 Cancellation
- Tourist requests on status page → refund computed by policy tier → confirm → Razorpay refund → room-nights released → partner notified; partner's payout adjusted.

---

## 8. Data model (MongoDB)

All money stored as **integer paise**. All dates as UTC; night dates stored as `YYYY-MM-DD` strings in `Asia/Kolkata`.

| Collection | Key fields | Notes |
|---|---|---|
| `partners` | `type` (homestay/hotel/operator), `name`, `ownerName`, `whatsapp`, `email`, `verificationStatus`, `documents[]`, `razorpayLinkedAccountId`, `commissionPct`, `subscription{plan,status,renewsAt}`, `responseSlaStats` | Never store bank details; Razorpay holds them |
| `properties` | `partnerId`, `name`, `type`, `location{town,district,geo}`, `photos[]`, `amenities[]`, `distances[{sight,km}]`, `houseRules`, `registrationNo`, `status` | Homestays ≤ 4 rooms (rule: < 5) |
| `rooms` | `propertyId`, `name`, `capacity`, `basePrice`, `icalImportUrls[]`, `icalExportToken` | |
| `inventory` | `roomId`, `date`, `price`, `status` (available/held/booked/blocked), `bookingId?`, `holdExpiresAt?`, `source` (platform/ical/manual) | **Unique index `(roomId, date)`** — one doc per room per night |
| `packages` | `slug`, `title`, `region`, `durationDays`, `itinerary[]`, `operatorId`, `stays[{night, propertyId, roomType}]`, `vehicleType`, `price`, `priceUnit` (person/vehicle), `priceFloorRef` (same unit), `minGuests`, `maxGuests`, `permitType` (RAP/PAP/none), `routes[]`, `status`. Departures live in their own `departures` collection (`packageId`, `date`, `capacity`, `seatsLeft`), decremented atomically in the hold transaction | |
| `bookings` | `code` (human-readable), `tourist{phone,name,email}`, `items[{type,refId,dates,qty,amount,partnerId,commission}]`, `amount`, `commission`, `taxes`, `status`, `statusHistory[]`, `razorpayOrderId`, `razorpayPaymentId`, `holdExpiresAt`, `partnerConfirmations[]` | |
| `permit_requests` | `bookingId`, `operatorId`, `permitType`, `travelDate`, `guests[{name,age,gender,nationality,idType,idNumberMasked,idFileKey}]`, `status` (pending_docs/ready/filed/approved/rejected), `deleteDocsAfter` | ID files deleted after trip (§10.3) |
| `payouts` | `partnerId`, `bookingId`, `gross`, `commission`, `fees`, `net`, `razorpayTransferId`, `status`, `utr`, `releasedAt` | |
| `reviews` | `bookingId`, `propertyId/packageId`, `rating`, `text`, `partnerReply`, `status` | Only for completed bookings |
| `messages` | `to`, `template`, `bookingId?`, `waMessageId`, `status`, `error?` | Delivery tracking |
| `route_status` | `route`, `status` (open/closed/restricted), `from`, `to`, `note` | |
| `audit_logs` | `actor`, `action`, `entity`, `entityId`, `before`, `after`, `at` | Append-only |
| `webhook_events` | `provider`, `eventId`, `processedAt` | Idempotency |

### 8.1 Booking state machine
```
held ──pay──▶ paid ──all partners confirm──▶ confirmed ──trip ends──▶ completed
 │             │                                │
 │ timeout     │ partner declines, no rebook     │ tourist/admin cancels
 ▼             ▼                                ▼
expired     refunded ◀──────────────────── cancelled ──▶ refunded (per policy)
```
Allowed transitions are enforced in one place in code; every transition writes `statusHistory` and `audit_logs`.

### 8.2 Inventory invariant
A room-night can be in exactly one of: `available`, `held`, `booked`, `blocked`. Transition `available → held` happens only inside a MongoDB transaction that checks all requested nights at once; any conflict aborts the whole booking.

---

## 9. Platform decisions

### 9.1 Website, not app (now)
- Tourists visit once or twice in their life and won't install an app; they Google and book on a website.
- Next.js SSR ranks on Google and opens instantly from Instagram links.
- Owners already live in WhatsApp; alerts there + one dashboard link beats a new app.
- No app store reviews, two builds, or update cycles.

### 9.2 When to build an app
- Partners use the dashboard daily and need reliable push or offline use in North Sikkim → **partner app first** (React Native, reusing Chito experience).
- Customers return often (locals booking taxis, weekend trips).
- ~1,000 bookings and an app would clearly lift conversion.

### 9.3 Tech stack

| Layer | Choice | Why |
|---|---|---|
| Website | Next.js (App Router, TypeScript), PWA | SEO, fast on phones, installable for partners |
| Backend | Next.js API routes / route handlers (Express only if a separate worker is needed) | One language end to end |
| Database | MongoDB Atlas with multi-document transactions | Locks room-nights during payment |
| Payments | Razorpay Orders + Route (split payouts, transfers on hold until check-in) | Collect from tourist, pay partner minus commission |
| Messaging | WhatsApp Business Cloud API (Meta) or a BSP | Alerts, confirmations, document requests |
| Calendar sync | iCal (RFC 5545) import/export | Airbnb / Booking.com parity |
| Files | S3-compatible object storage, private bucket, signed URLs | Guest IDs; auto-delete after trip |
| Hosting | Vercel + MongoDB Atlas (Mumbai region) | Cheap to start, data in India |
| Background jobs | Vercel Cron (hold release, iCal sync, reminders, doc deletion) | No extra infra early on |

---

## 10. Non-functional requirements

### 10.1 Performance and reliability
- Mobile LCP < 2.5 s on 4G; pages usable on 3G and low-end Android.
- Availability check + hold < 1 s p95.
- 99.5% uptime during peak seasons (Apr–Jun, Oct–Jan).
- Webhooks idempotent; payment state always reconcilable against Razorpay (daily reconciliation job).

### 10.2 Security
- Razorpay webhook signature verification; WhatsApp webhook verification.
- OTP login with rate limiting; short-lived sessions; partner and admin roles enforced server-side.
- Secrets only in environment variables; never in the repo.
- No card/bank data stored. ID images in a private bucket, accessed only via short-lived signed URLs by the assigned operator and admin.
- Audit log for all admin and payout actions.

### 10.3 Privacy and data protection (DPDP Act, 2023)
- Collect only what permits require; explicit consent checkbox at ID upload stating purpose (permit filing) and retention.
- Store ID numbers **masked** (e.g. last 4 digits) in the DB; full ID only on the uploaded image. Encourage masked Aadhaar.
- **Delete guest ID files within 7 days after trip end** (scheduled job; `deleteDocsAfter` field); log deletion.
- Guest phone numbers visible to partners only after confirmation, only for that booking.
- Privacy policy, terms, cancellation/refund policy pages live before launch.

### 10.4 Accessibility and localisation
- WCAG 2.1 AA basics: contrast, tap targets ≥ 44px, labels on form fields.
- English at launch; Hindi/Bengali later; Nepali for partner messages considered.

### 10.5 Observability
- Error tracking (e.g. Sentry), structured logs, alerts on webhook failures, message delivery failures and partner SLA breaches.
- Analytics events: `search`, `view_package`, `view_property`, `start_checkout`, `hold_created`, `payment_success`, `payment_failed`, `hold_expired`, `partner_confirmed`, `partner_declined`, `docs_uploaded`, `permit_filed`, `booking_cancelled`.

---

## 11. Business model and revenue plan

**Streams**
- **Commission:** 8–12% on each booking (rooms, packages, transport). Default 10%.
- **Partner subscription:** ₹999–1,499/month for booking tool, calendar sync, WhatsApp alerts (Phase 2+).

**Assumptions:** average booking ₹25,000 (couple's North Sikkim trip + Nathula day), 10% commission, ₹1,200/month per partner.

| Year | Trips | Booking value | Commission | Paying partners | Subscriptions | Total revenue |
|---|---|---|---|---|---|---|
| 1 | 400 | ₹1 crore | ₹10 lakh | 50 | ₹7.2 lakh | ₹17.2 lakh |
| 2 | 1,500 | ₹3.75 crore | ₹37.5 lakh | 150 | ₹21.6 lakh | ₹59.1 lakh |
| 3 | 2,500 | ₹6.25 crore | ₹62.5 lakh | 300 | ₹43.2 lakh | ₹1.06 crore |

- 2,500 trips is < 1% of 17 lakh yearly visitors; 300 partners ≈ 10% of stays.
- If registered as a tour operator selling trips directly, revenue counts the full trip price (₹1 crore ≈ 400 trips) but margin is far lower.
- **Revenue ≠ profit:** budget for WhatsApp API costs, Razorpay fees (~2%), ads, GST compliance, and 1–2 partner-support staff by Year 2.

---

## 12. Competitive positioning

| Player | What they do | Our edge |
|---|---|---|
| Booking.com, Airbnb, MakeMyTrip | Rooms only, high commission, no permits | Full trip with permits, lower commission, local support |
| Fusionstays | Homestay listings for Bengal and Sikkim | Live availability, fixed-price packages, partner software |
| NETaxi | Biggest taxi platform in Sikkim | Potential transport partner, not a rival |
| Gangtok travel agencies | Packages over phone/WhatsApp | Transparent online prices, instant booking |

---

## 13. Risks, licensing and compliance

| Risk | What can go wrong | Mitigation | Product implication |
|---|---|---|---|
| Licensing | Selling trips without registration under the Sikkim Registration and Licensing of Tourist Trade Act, 2022 | Start as booking partner of registered operators; register own firm once bookings are steady | Operator is the seller of record for permit trips; show operator name and licence no. on package pages |
| Permits | Only Sikkim-registered operators and Sikkimese drivers may run RAP/PAP tours | Route every permit trip through a partner operator | Permit flow + guest-ID collection is core, not optional |
| Seasonality | February lean; monsoon landslides close roads | Push winter carnival trips, Gangtok/Pelling stays; low fixed costs | Seasonal landing pages; route status banner |
| Route closures | Lachen/Gurudongmar closed for months after June 2025 | Never depend on one route | Route closure tooling (A-10), alternate-route offers |
| Local pushback | Taxi/operator associations resist fixed public prices | Give partners a share, use government-notified fares as baseline, sign associations early | Price floors tied to notified fares |
| Big booking sites | Already list hotels | Win on permits, packages, low commission | Don't compete on rooms-only listings |
| Payments | Chargebacks, failed payouts | Razorpay Route with transfer on-hold until check-in | Payout release tied to trip status |
| Data | ID leak | Private bucket, signed URLs, auto-deletion, masked IDs | §10.3 |

**Compliance checklist**
- [ ] Check eligibility for operator registration with the Tourism and Civil Aviation Department
- [ ] Register a company or LLP; GST registration
- [ ] Open Razorpay account; enable Route
- [ ] WhatsApp Business API account + template approvals
- [ ] Privacy policy, terms, cancellation/refund policy
- [ ] Apply to Sikkim Innovation Hub (IIM Calcutta Innovation Park) incubation programme
- [ ] Apply for Sikkim Startup Policy seed funding (requires Sikkim-based startup)

---

## 14. Open questions

1. Current OTA commission rates paid by Sikkim hotels/homestays — confirm with 5–10 owners during first visits.
2. Cancellation policy tiers (proposal: > 15 days 90% refund, 7–15 days 50%, < 7 days 0% except route closure/force majeure = 100%).
3. Who is seller of record and GST treatment on packages (us as agent vs operator) — needs CA advice.
4. Does the online RAP/PAP portal offer any operator API, or is filing manual? Determines how much of P-10 we can automate.
5. Payout timing: release on check-in, check-out, or T+N? (proposal: on check-in day via Route transfer on-hold release).
6. Platform fee to tourists, or commission only from partners? (proposal: commission only, to keep prices "fixed and public").
7. Brand name and domain.
8. NETaxi partnership for non-permit transport legs?
9. Subscription pricing tiers and free trial length for partners.

---

## 15. Acceptance criteria for MVP launch (Phase 1)

- [ ] A tourist can book each of the 3 launch packages end-to-end on a mid-range Android phone with UPI.
- [ ] Concurrent booking test: 50 parallel attempts on the last available room-night result in exactly 1 booking.
- [ ] Unpaid holds release within 11 minutes.
- [ ] Duplicate Razorpay webhooks do not create duplicate bookings or payouts.
- [ ] Partner receives WhatsApp alert within 60 s of payment and can confirm with one tap.
- [ ] Permit trip: operator receives complete guest list and IDs; tourist sees permit status.
- [ ] Guest ID files are deleted by the scheduled job after trip end + 7 days.
- [ ] Admin can close a route and affected bookings are notified.
- [ ] Refund from admin panel reflects in Razorpay and booking status.
- [ ] Legal pages live; consent captured at ID upload.

---

## 16. Sources (from business plan)
EastMojo (2025 arrivals; 2026 five-month footfall) · Travel Trends Today (hotels, homestays, Mega Homestay Scheme) · Ministry of Tourism (NIDHI+) · Sikkim University study (homestay owners and social media) · Gaon Connection (homestays, NETaxi) · Daily Excelsior (hotels cut off MMT/Goibibo) · Telegraph (homestay rules) · Travel Trade Journal (online RAP/PAP; New Year rush) · Outlook Traveller (permits via operators) · iQOO Community (North Sikkim costs) · Assam Tribune (overcharging committee) · Arunachal Times (Gangtok–Nathula fare) · Sikkim Registration and Licensing of Tourist Trade Act, 2022 · Startup India (Sikkim report) · NE Now (IIM Calcutta Innovation Park) · Fusionstays listings.

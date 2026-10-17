# CLAUDE.md — Sikkim Trip Platform

Guidance for Claude Code when working in this repository. The product spec is in [docs/PRD.md](docs/PRD.md); read it before building any feature and cite requirement IDs (e.g. `T-07`, `P-01`, `A-10`) in commits and PRs.

## What this is

A booking platform for Sikkim trips with three parts:
1. **Tourist website** — fixed-price packages (North Sikkim 2N/3D, Nathula day trip, Pelling weekend), homestay pages with live availability, Razorpay checkout, guest ID upload for permits, booking status page.
2. **Partner tool** — WhatsApp-first (alerts + Confirm/Decline buttons) plus a PWA dashboard for room calendar, iCal sync, payouts, reviews. Partners = homestays, hotels, registered tour operators.
3. **Admin panel** — partner verification, package pricing, permit routing to operators, commissions, refunds, route closures.

Revenue = 8–12% commission per booking + ₹999–1,499/month partner subscription.

## Current phase

**Phase 1 MVP built, not yet launched** (see PRD §5). Build only what the current phase needs:
- Phase 1 (MVP), in the repo: tourist website, checkout with 10-minute holds, booking status page with guest-ID upload, admin panel, WhatsApp templates, partner confirm via WhatsApp button, cron jobs. Admin enters inventory on partners' behalf.
- Not done yet in Phase 1: real Razorpay/WhatsApp/S3 credentials, Playwright e2e, service worker, real photos (see "Design").
- Phase 2 items (partner dashboard, iCal, automated Route payouts, subscriptions, reviews) are **out of scope** until Gate 1 is met — don't build them unless asked.
- **No native app.** Mobile-first website + PWA only.

Update this section when the phase changes.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) |
| UI | Tailwind CSS v4, mobile-first; PWA manifest (service worker still to add) |
| Backend | Next.js route handlers (`src/app/api/**/route.ts`) and server actions |
| DB | MongoDB Atlas (Mumbai) via Mongoose; **multi-document transactions** for inventory |
| Validation | Zod at every API/server-action boundary |
| Payments | Razorpay Orders + webhooks; Razorpay Route for split payouts |
| Messaging | WhatsApp Business Cloud API (templates); SMS fallback for OTP |
| Files | S3-compatible private bucket, signed URLs |
| Jobs | Vercel Cron runs `/api/cron/daily` (Hobby plan); `release-holds` and `partner-sla` can be called by an external cron. All protected by `CRON_SECRET` |
| Hosting | Vercel |
| Tests | Vitest (unit/integration with `mongodb-memory-server` replica set); Playwright e2e still to add |

## Layout

```
src/
  app/                  # routes only: pages, layouts, route handlers
    (tourist)/          # public site: /, /packages, /stays, /checkout, /booking/[code], legal pages
    admin/login/        # admin OTP sign-in
    admin/(panel)/      # admin panel; actions.ts holds the server actions
    api/
      auth/otp/         # request + verify (tourist and admin sessions)
      bookings/         # create hold (+ Razorpay order), [code]/cancel, [code]/guests
      payments/razorpay/webhook/
      whatsapp/webhook/
      cron/             # daily (Vercel), release-holds and partner-sla (external cron)
      dev/simulate-payment/  # local only, when no Razorpay keys
      files/[...key]/   # serves GridFS files (signed URL + admin session)
  components/           # admin/, booking/, catalog/, home/, layout/, ui/ (group new components by area)
  server/               # SERVER-ONLY: never import from a "use client" file (type-only imports are fine)
    db/                 # mongoose connection, models/ (one file per collection)
    booking/            # stateMachine, createHold, payment, confirmations, cancel, expire, notify, quote
    inventory/holds.ts  # hold/release/confirm room-nights and seats, inside transactions
    admin/              # admin operations (partners, stays, inventory, packages, route closures)
    auth/               # OTP, sessions, role guards
    payments/           # razorpay client, signature verify
    whatsapp/           # template senders, webhook parsing
    permits/            # guest list assembly, operator handoff, ID purge
    storage/            # S3 or GridFS, signed URLs, deletion
    catalog.ts          # read models for public pages (plain JSON)
    routeClosures.ts    # road closures, banner data, sales blocking
    env.ts http.ts audit.ts
  lib/                  # SHARED: pure helpers safe on client and server
    money.ts            # paise helpers + INR formatting
    dates.ts            # IST night-date helpers
    phone.ts errors.ts site.ts content.ts
scripts/                # dev-db.ts (local replica set), seed.ts (sample data)
tests/                  # unit/ and integration/; globalSetup starts an in-memory replica set
docs/                   # PRD.md, SETUP.md
```

Business logic lives in `src/server/`, not in route handlers or components. Route handlers: parse with Zod → call a `src/server/` function → return. Imports use the `@/` alias (points at `src/`).

## Commands

```bash
npm run dev:db       # local MongoDB replica set on :27017 (data in .data/db); leave running
npm run seed         # sample partners, stays, packages (add -- --reset to wipe first; dev only)
npm run dev          # http://localhost:3000 (reads .env.local)
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # vitest (downloads a mongod binary on first run)
```

Local test mode: with no WhatsApp keys, OTP codes are shown on screen and messages are logged as "skipped". With no Razorpay keys, checkout uses `/api/dev/simulate-payment` (same code path as the webhook). With no S3 keys, files go to a MongoDB GridFS bucket (`guest_files`) in every environment. The OTP and payment fallbacks are disabled when `NODE_ENV=production`, except that `NEXT_PUBLIC_TEST_MODE=true` keeps sign-in codes on screen (never with `rzp_live_` keys) and shows a test-mode banner. Admin sign-in needs your number in `ADMIN_PHONES`.

Before declaring work done: `lint`, `typecheck` and `test` must pass.

## Domain rules — do not break these

### Money
- Store all amounts as **integer paise** (`number`, never float rupees). Convert only for display via `src/lib/money.ts`.
- Commission computed per booking item with the partner's `commissionPct` (default 10, range 8–12). Round once, at item level, half-up.
- The price shown to the tourist before payment is the price charged. No hidden add-ons.

### Dates
- Night dates are `YYYY-MM-DD` strings in **Asia/Kolkata**. Timestamps are UTC `Date`. Never use server-local time for night boundaries.

### Inventory and double-booking (most critical code in the repo)
- One `inventory` doc per room per night; **unique index on `(roomId, date)`**.
- Status is exactly one of `available | held | booked | blocked`.
- Holding is all-or-nothing: check and flip every requested night to `held` inside **one MongoDB transaction** using conditional updates (`{status: 'available'}` in the filter). If any night fails, abort the whole transaction.
- Hold lasts **10 minutes** (`holdExpiresAt`). `cron/release-holds` runs every minute and releases expired holds. Do not use a TTL index for this (it deletes docs).
- A late payment webhook for an expired hold must re-check availability in a transaction; if gone, auto-refund and notify.
- Every change to inventory/booking logic needs a concurrency test (parallel holds on the last room-night → exactly one succeeds).

### Booking state machine
`held → paid → confirmed → completed`, plus `held → expired`, `paid|confirmed → cancelled → refunded`, `paid → refunded` (partner decline with no rebook), and `expired → paid` / `expired → refunded` (late payment: rebook if the nights are still free, else auto-refund). Transitions are defined in **one** place (`src/server/booking/stateMachine.ts`); every transition appends `statusHistory` and an `audit_logs` entry. Never set `booking.status` directly elsewhere.

### Payments (Razorpay)
- Create the Razorpay order server-side; never trust amounts from the client.
- Verify webhook signatures (`RAZORPAY_WEBHOOK_SECRET`) on the raw body before parsing.
- Webhooks are **idempotent**: record `eventId` in `webhook_events`; skip if seen.
- Payment success is driven by the `payment.captured` webhook, not by the client redirect.
- Never store card or bank details. Partner payout accounts live in Razorpay (linked accounts); we store only `razorpayLinkedAccountId`.
- Route transfers are created on-hold and released per payout policy (open question PRD §14.5).

### Permits (RAP/PAP)
- We **never** file permits. Every permit trip (Nathula, Tsomgo, Lachen, Lachung, Zuluk, Gurudongmar) is linked to a Sikkim-registered partner operator who files on the government portal.
- Package pages show the operator's name and licence number (operator is seller of record for permit trips).
- Collect per guest: name, age, gender, nationality, ID type, ID number (store **masked**, last 4 only), ID image. Flag foreign nationals (PAP rules differ).

### Privacy (DPDP Act, 2023)
- Guest ID images go to a **private** bucket; access only via short-lived signed URLs for the assigned operator and admins.
- `cron/purge-guest-docs` deletes ID files **7 days after trip end** and logs the deletion. Don't add code paths that copy ID files elsewhere.
- Explicit consent checkbox at ID upload (purpose + retention).
- Tourist phone numbers are visible to a partner only after that partner confirms, only for that booking.
- Never log full ID numbers, OTPs, phone numbers in full, or payment secrets.

### Messaging (WhatsApp)
- Business-initiated messages must use **approved templates** (names listed in PRD §6.4). Free-form text only inside the 24-hour customer window.
- All sends go through `src/server/whatsapp/` and are recorded in the `messages` collection with delivery status.
- Partner Confirm/Decline arrives as a button reply on the WhatsApp webhook — verify the sender number matches the partner on the booking.
- Partner SLA: escalate to admin if no response in 2 h (30 min for bookings within 7 days).

### Pricing
- Packages are fixed-price; no dynamic pricing. `price` is per `priceUnit` (`person` or `vehicle`); a per-vehicle trip takes 1 slot on the departure whatever the group size.
- Where the government notifies a fare (e.g. Gangtok–Nathula round trip ₹6,500 normal / ₹7,000 luxury), store it as `priceFloorRef` (same unit as `price`) and don't price below it.

### Route closures
- `route_status` drives a site banner and blocks sales on closed routes. Closures must notify affected bookings with alternate route / reschedule / full refund options.

### Homestays
- Homestays have < 5 rooms (validate ≤ 4) and are owner-run.

## Design

Calm and trustworthy, simple on purpose (Rohan's call). Based on the user's `10k-websites` skill (zip in `.skills/`, gitignored) for direction and copy rules, without the cinematic video or heavy motion.
- **Direction:** "the fixed fare". Mist canvas `#eef2ef`, pine ink `#14251f`, rhododendron red `#b3263e` as the rare accent (CTAs, focus, the stamp). Fonts: Bricolage Grotesque (display), Figtree (body), JetBrains Mono (labels). Tokens live in `src/app/globals.css`.
- **Signature element:** trips are sold as fare tickets with a photo, a perforated tear line and a "Fixed" stamp (`src/components/catalog/FareTicket.tsx`).
- **Photos:** Rohan's own photos in `public/images/` (see `public/images/README.md`), shown through `src/components/ui/Photo.tsx` (Next.js image optimisation). Never use images found on Google Search. Without a photo, cards fall back to drawn art (`StayArt`), and the home hero to `MountainScene`. Hero photo: `NEXT_PUBLIC_HERO_IMAGE`. Trip and stay photos are set in the admin panel.
- **Motion:** keep it minimal. Only hover and focus transitions, plus one optional muted hero loop (`NEXT_PUBLIC_HERO_VIDEO`, e.g. `public/videos/hero.mp4`, made from the hero photo with ffmpeg, about 2 MB), hidden under `prefers-reduced-motion`. No scroll animations, parallax, page fades or other looping effects.
- **Copy gate before shipping UI copy:** no em dashes, none of: leverage, seamless, empower, unlock, robust, actionable, data-driven, solutions, testament, landscape, delve, elevate. Plain, short sentences.
- Custom component classes (`.btn`, `.field`, `.ticket`, …) sit in `@layer components` so Tailwind utilities can override them. Keep it that way.

## Coding conventions

- TypeScript strict; no `any` without a comment explaining why.
- Server Components by default; `"use client"` only where interactivity requires it.
- Zod schemas are the source of truth for request shapes; infer types from them.
- Mongoose models in `src/server/db/models/<Name>.ts`, one per collection; add indexes in the schema.
- Use `session` (transaction) parameters explicitly in `src/server/inventory` and `src/server/booking` functions.
- Errors: throw typed domain errors (`HoldConflictError`, `InvalidTransitionError`, …) from `src/server/`; map to HTTP status in route handlers.
- Mobile-first UI: design at 360px width first; tap targets ≥ 44px; keep JS small — many users are on 3G/4G in hills.
- SEO pages (packages, stays, landing pages) are server-rendered with `generateMetadata` and schema.org JSON-LD.
- Copy is plain English, short sentences; INR formatted as `₹12,500` (Indian grouping, e.g. `₹1,25,000`).
- Don't add new dependencies without a clear reason; prefer the platform and existing libs.

## Environment variables

Keep `.env.example` in sync (names only, no values). Never commit `.env*` files with secrets.

```
MONGODB_URI=
NEXT_PUBLIC_SITE_URL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
SMS_PROVIDER_API_KEY=
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
SESSION_SECRET=
CRON_SECRET=
SENTRY_DSN=
ADMIN_ALERT_WHATSAPP=
ADMIN_PHONES=
NEXT_PUBLIC_SUPPORT_WHATSAPP=
NEXT_PUBLIC_HERO_IMAGE=
S3_REGION=
```

Use Razorpay **test mode** keys and WhatsApp test numbers locally; never point local dev at live keys.

## Testing expectations

- `src/server/booking`, `src/server/inventory`, `src/server/payments`, `src/lib/money.ts`, `src/lib/dates.ts`: unit + integration tests required for every change.
- Integration tests run MongoDB as a **replica set** (transactions need it).
- Must-have tests: concurrent hold race, hold expiry release, duplicate webhook, late webhook after expiry, every allowed and forbidden state transition, commission rounding, IST date boundaries, ID purge job.
- E2E (Playwright, mobile viewport): book a package with Razorpay test payment, upload IDs, see status page.

## Git

- **Never run `git commit` or `git push`.** Rohan does all commits and pushes. Leave changes in the working tree and say what changed.
- Never add `Co-Authored-By` or "Generated with Claude" lines to commit messages or PR descriptions, even when drafting one for Rohan to use.

## Things to ask before doing

- Anything touching live payments, refunds, or payouts in production.
- Changing commission defaults, cancellation policy, or price floors.
- Sending real WhatsApp messages to non-test numbers.
- Adding a Phase 2/3 feature during Phase 1.
- Storing any new category of personal data.

## Reference

- Product spec: [docs/PRD.md](docs/PRD.md)
- Launch packages: North Sikkim 2N/3D (~₹8,000–12,000 pp), Nathula day trip (₹6,500 / ₹7,000 notified fare), Pelling weekend.
- Peak seasons: Apr–Jun, Oct–Jan. Lean: February. Monsoon (Jun–Sep) brings landslide closures.
- Licensing: Sikkim Registration and Licensing of Tourist Trade Act, 2022 — we operate as booking partner of registered operators until our own registration.

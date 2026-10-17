# Sikkim Trip

Booking platform for Sikkim trips: fixed-price packages (North Sikkim, Nathula, Pelling), homestays with live availability, permit handling through registered operators, and an admin panel. Built with Next.js, TypeScript, Tailwind CSS and MongoDB.

## Quick start

```bash
npm install
npm run dev:db     # terminal 1: local MongoDB replica set, leave running
npm run seed       # terminal 2: sample stays and trips (one time)
npm run dev        # http://localhost:3000
```

Copy `.env.example` to `.env.local` first. With no payment, WhatsApp or storage keys the app runs in local test mode. Admin is at `/admin` (your number must be in `ADMIN_PHONES`).

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Project layout

```
src/
  app/                    routes only (pages, layouts, API handlers)
    (tourist)/            public site: home, trips, stays, checkout, booking status, policies
    admin/                admin sign-in and panel (server actions in admin/(panel)/actions.ts)
    api/                  auth, bookings, Razorpay and WhatsApp webhooks, cron jobs
  components/             React UI, grouped by area
    admin/                admin panel building blocks
    booking/              checkout, guest ID form, cancellation
    catalog/              fare tickets, stay cards, availability pickers, search
    home/                 hero, mountain scene, press-and-hold stamp
    layout/               nav, footer, banners, legal page shell
    ui/                   small shared helpers (reveal on scroll, auto refresh)
  server/                 server-only code: database, business rules, integrations
    db/                   MongoDB connection and models (one file per collection)
    booking/              holds, payments, confirmations, cancellations, state machine
    inventory/            room-night and seat holds (transactions)
    admin/                admin operations (partners, stays, packages, closures)
    auth/                 OTP sign-in and sessions
    payments/             Razorpay client and signatures
    permits/              guest ID collection and operator handoff
    storage/              private file storage (S3 or MongoDB GridFS)
    whatsapp/             WhatsApp client and message templates
    catalog.ts            read models for public pages
    routeClosures.ts      road closures and the site banner
    env.ts, http.ts, audit.ts
  lib/                    shared helpers safe in the browser too
    money.ts, dates.ts, phone.ts, errors.ts, site.ts, content.ts
scripts/                  dev-db.ts (local MongoDB), seed.ts (sample data)
tests/
  unit/               pure functions (money, dates)
  integration/        booking flows against an in-memory MongoDB replica set
docs/
  PRD.md              product requirements
  SETUP.md            accounts and keys needed to go live
public/                   static files (icon, hero video later)
```

Rule of thumb: client components (`"use client"`) import only from `src/lib/` and `src/components/`, never from `src/server/` (type-only imports are fine). Imports use the `@/` alias, which points at `src/`.

## Docs

- [Product requirements](docs/PRD.md)
- [Setup: accounts and keys to go live](docs/SETUP.md)
- [CLAUDE.md](CLAUDE.md): rules for AI-assisted work on this repo

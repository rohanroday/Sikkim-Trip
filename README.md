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
app/
  (tourist)/          public site: home, trips, stays, checkout, booking status, policies
  admin/              admin sign-in and panel (server actions in admin/(panel)/actions.ts)
  api/                auth, bookings, Razorpay and WhatsApp webhooks, cron jobs
components/
  admin/              admin panel building blocks
  booking/            checkout, guest ID form, cancellation
  catalog/            fare tickets, stay cards, availability pickers, search
  home/               hero, mountain scene, press-and-hold stamp
  layout/             nav, footer, route banner, legal page shell
  ui/                 small shared helpers (reveal on scroll, auto refresh)
lib/                  business logic: bookings, inventory, payments, permits, models
scripts/              dev-db.ts (local MongoDB), seed.ts (sample data)
tests/
  unit/               pure functions (money, dates)
  integration/        booking flows against an in-memory MongoDB replica set
docs/
  PRD.md              product requirements
  SETUP.md            accounts and keys needed to go live
public/               static files (icon, hero video later)
```

## Docs

- [Product requirements](docs/PRD.md)
- [Setup: accounts and keys to go live](docs/SETUP.md)
- [CLAUDE.md](CLAUDE.md): rules for AI-assisted work on this repo

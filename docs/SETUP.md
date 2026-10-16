# Setup: what you need to provide

The code runs locally today with no accounts at all (test mode). To take real bookings you need the items below. Each one maps to variables in `.env.example` (repo root). Paths below are from the repo root.

## 1. Run it on your computer (no accounts needed)

```bash
npm install
npm run dev:db        # terminal 1: local MongoDB, leave it running
npm run seed          # terminal 2: sample stays and trips (one time)
npm run dev           # then open http://localhost:3000
```

`.env.local` already points at the local database. Admin is at `/admin`: put your own number in `ADMIN_PHONES` in `.env.local`. In test mode the sign-in code shows on screen, and checkout skips the real payment.

## 2. Accounts and keys to get

| # | What | Why | Env variables | Notes |
|---|---|---|---|---|
| 1 | **MongoDB Atlas** cluster, Mumbai region | Live database | `MONGODB_URI` | Free M0 is fine to start. Atlas clusters are replica sets, so transactions work. |
| 2 | **Razorpay** account (test keys first, then live) | Take payments, refunds | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET` | Live mode needs your company or LLP and KYC. Add a webhook to `https://<your-domain>/api/payments/razorpay/webhook` for `payment.captured` and `refund.processed`. Turn on **Route** later for automatic partner payouts (Phase 2). |
| 3 | **WhatsApp Business Cloud API** (Meta) | OTP codes, booking alerts, partner Confirm/Decline buttons | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `ADMIN_ALERT_WHATSAPP` | Needs a verified Meta Business account and a phone number not already on WhatsApp. Set the webhook to `https://<your-domain>/api/whatsapp/webhook` and subscribe to `messages`. Submit the 15 templates in `lib/whatsapp/templates.ts` for approval (names and text must match exactly). |
| 4 | **Private file storage** (AWS S3 in Mumbai, or Cloudflare R2) | Guest ID photos for permits | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (R2 only) | Keep the bucket private. The app deletes IDs 7 days after each trip. Add a 30-day lifecycle rule as a backup. |
| 5 | **Vercel** project | Hosting and cron jobs | all of the above plus `SESSION_SECRET` (random, 32+ chars), `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` | The 1-minute hold-release cron in `vercel.json` needs the **Pro** plan (Hobby only allows daily crons). |
| 6 | **Domain and brand name** | Site address, WhatsApp display name | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_WHATSAPP` | The brand name is in `lib/site.ts` ("Sikkim Trip" for now). |
| 7 | Error tracking (optional) | Alerts when something breaks | `SENTRY_DSN` | Not wired up yet. |

## 3. Business inputs only you can give

- **Real partners:** homestay and operator names, WhatsApp numbers, registration and licence numbers, commission agreed with each (8 to 12%).
- **Real trips and prices:** the three launch packages with costs agreed with operators and homestays. Nathula uses the ₹6,500 notified fare as its floor.
- **Photos** of each stay (paste a photo URL in admin; placeholder art shows until then).
- **Cancellation policy sign-off:** the 90% / 50% / 0% tiers are a proposal (`lib/booking/cancel.ts`).
- **Legal review** of `/privacy`, `/terms` and `/cancellation-policy` (marked DRAFT in the code), and CA advice on GST and who is seller of record.
- **Operator registration** check with the Tourism and Civil Aviation Department, and company or LLP registration (needed for Razorpay live mode).

## 4. Optional: the cinematic hero video

The `10k-websites` skill makes a scroll-driven hero video with Higgsfield (paid credits). The site is ready for it: encode the video, put it in `public/hero/`, and set `NEXT_PUBLIC_HERO_VIDEO=/hero/hero-scrub.mp4`. Desktop visitors then get the scroll video. Phones keep the drawn mountain hero.

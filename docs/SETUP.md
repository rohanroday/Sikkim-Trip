# Setup: what you need to provide

The code runs locally today with no accounts at all (test mode). To take real bookings you need the items below. Each one maps to variables in `.env.example` (repo root). Paths below are from the repo root.

## 1. Run it on your computer (no accounts needed)

```bash
npm install
npm run dev:db        # terminal 1: local MongoDB, leave it running
npm run seed          # terminal 2: sample stays and trips (one time)
npm run dev           # then open http://localhost:3000
```

`.env.local` already points at the local database. Admin is at `/admin`: put your own number in `ADMIN_PHONES` in `.env.local`. Locally the sign-in code shows on screen. With no Razorpay keys, checkout skips the real payment.

## 2. Go live in test mode (tonight)

This gives you a public site with the real database and Razorpay **test** payments. You don't need WhatsApp or S3 yet. While `NEXT_PUBLIC_TEST_MODE=true`, sign-in codes show on screen, and ID photos are stored in MongoDB (GridFS).

1. **MongoDB Atlas**
   - Create a free M0 cluster in AWS Mumbai and add a database user.
   - Network Access: allow `0.0.0.0/0`.
   - Copy the driver connection string and add `/sikkim` as the database name.
   - Put it in `.env.local` as `MONGODB_URI`, then run `npm run seed`.
2. **Razorpay test keys:** in the Dashboard, switch to Test mode, then Account & Settings → API Keys → Generate. Put them in `.env.local`.
3. **GitHub:** create a private repo, then commit and push.
4. **Vercel:** import the repo, add these env vars (Production), then deploy:

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | Atlas connection string |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-app>.vercel.app` |
   | `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` | test key id (`rzp_test_...`) |
   | `RAZORPAY_KEY_SECRET` | test key secret |
   | `RAZORPAY_WEBHOOK_SECRET` | the secret you set in step 5 |
   | `SESSION_SECRET` | random, 32+ characters |
   | `CRON_SECRET` | random |
   | `ADMIN_PHONES` | your number, e.g. `+9198xxxxxxxx` |
   | `NEXT_PUBLIC_TEST_MODE` | `true` |
   | `NEXT_PUBLIC_SUPPORT_WHATSAPP` | your WhatsApp number (digits only) |

5. **Razorpay webhook (test mode)**
   - URL: `https://<your-app>.vercel.app/api/payments/razorpay/webhook`
   - Events: `payment.captured` and `refund.processed`.
   - Use the same secret as `RAZORPAY_WEBHOOK_SECRET`, then redeploy.
6. **Optional: faster cleanup jobs.** Vercel Hobby only runs the daily job. You can add free cron-job.org jobs that call `/api/cron/release-holds` every minute and `/api/cron/partner-sla` every 10 minutes, with header `Authorization: Bearer <CRON_SECRET>`. Expired holds are also released whenever someone books, so this isn't required.

For test payments, use UPI `success@razorpay` or a card from Razorpay's test card list.

## 3. Before taking real money

Turn `NEXT_PUBLIC_TEST_MODE` off (it also switches off by itself with `rzp_live_` keys) and add the items below.

| # | What | Why | Env variables | Notes |
|---|---|---|---|---|
| 1 | **MongoDB Atlas** cluster, Mumbai region | Live database | `MONGODB_URI` | Free M0 is fine to start. Atlas clusters are replica sets, so transactions work. |
| 2 | **Razorpay** account (test keys first, then live) | Take payments, refunds | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET` | Live mode needs your company or LLP and KYC. Add a webhook to `https://<your-domain>/api/payments/razorpay/webhook` for `payment.captured` and `refund.processed`. Turn on **Route** later for automatic partner payouts (Phase 2). |
| 3 | **WhatsApp Business Cloud API** (Meta) | OTP codes, booking alerts, partner Confirm/Decline buttons | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `ADMIN_ALERT_WHATSAPP` | Needs a verified Meta Business account and a phone number not already on WhatsApp. Set the webhook to `https://<your-domain>/api/whatsapp/webhook` and subscribe to `messages`. Submit the 15 templates in `src/server/whatsapp/templates.ts` for approval (names and text must match exactly). |
| 4 | **Private file storage** (AWS S3 in Mumbai, or Cloudflare R2), optional | Guest ID photos for permits | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (R2 only) | Without it, files are stored in MongoDB GridFS, which is fine at launch volumes. Keep the bucket private. The app deletes IDs 7 days after each trip. Add a 30-day lifecycle rule as a backup. |
| 5 | **Vercel** project | Hosting and cron jobs | all of the above plus `SESSION_SECRET` (random, 32+ chars), `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` | `vercel.json` runs one daily job, which works on Hobby. On Pro you can add the 1-minute and 10-minute jobs back. |
| 6 | **Domain and brand name** | Site address, WhatsApp display name | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_WHATSAPP` | The brand name is in `src/lib/site.ts` ("Sikkim Trip" for now). |
| 7 | Error tracking (optional) | Alerts when something breaks | `SENTRY_DSN` | Not wired up yet. |

## 4. Business inputs only you can give

- **Real partners:** homestay and operator names, WhatsApp numbers, registration and licence numbers, commission agreed with each (8 to 12%).
- **Real trips and prices:** the three launch packages with costs agreed with operators and homestays. Nathula uses the ₹6,500 notified fare as its floor.
- **Photos** of each stay (paste a photo URL in admin; placeholder art shows until then).
- **Cancellation policy sign-off:** the 90% / 50% / 0% tiers are a proposal (`src/server/booking/cancel.ts`).
- **Legal review** of `/privacy`, `/terms` and `/cancellation-policy` (marked DRAFT in the code), and CA advice on GST and who is seller of record.
- **Operator registration** check with the Tourism and Civil Aviation Department, and company or LLP registration (needed for Razorpay live mode).

## 5. Photos

Use your own photos (Google Photos is fine), not images from Google Search. See `public/images/README.md`:
- **Home hero:** `public/images/hero.jpg`, then set `NEXT_PUBLIC_HERO_IMAGE=/images/hero.jpg` in `.env.local` and in Vercel.
- **Trips:** cover photos in `public/images/trips/`. Set each one in Admin → Packages → Photo.
- **Stays:** photos in `public/images/stays/`. Set them in Admin → Stays → (a stay) → Photos.

- **Hero video (optional):** `public/videos/hero.mp4` is a 16-second muted loop made from the hero photo. Set `NEXT_PUBLIC_HERO_VIDEO=/videos/hero.mp4`. To use your own clip, export it muted, about 1600 px wide and under 5 MB, and save it with the same name.

Until a photo is set, the site shows drawn mountain art instead. The current photos are AI-generated placeholders: replace stay photos with real photos of each homestay before taking real bookings.

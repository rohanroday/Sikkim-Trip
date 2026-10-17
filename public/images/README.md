# Site photos

Put your own photos here (downloaded from Google Photos is fine). Don't use images found on Google Search: they are usually copyrighted.

- `hero.jpg`: the big photo on the home page. Then set `NEXT_PUBLIC_HERO_IMAGE=/images/hero.jpg` (in `.env.local` and in Vercel).
- `trips/`: one cover photo per trip, e.g. `trips/north-sikkim.jpg`. Set it in Admin → Packages → Photo as `/images/trips/north-sikkim.jpg`.
- `stays/`: photos of each homestay, e.g. `stays/yumthang-1.jpg`. Set them in Admin → Stays → (a stay) → Photos, one per line.

Tips: landscape photos work best. Export at about 2000 px wide (JPG, quality 80). Next.js resizes and compresses them for phones.

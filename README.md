# Industrial Ledger Partners — website

Marketing homepage + ROI page + the embedded **Field2Bill** product demo.

## Files
- `index.html` — homepage (v2, Field2Bill-forward).
- `insights.html` — ROI Insights page.
- `Field2Bill-App.html` — the Field2Bill app the "Launch Field2Bill" buttons open.
- `support.js` + `materials-data.js` — **required by the app.** Keep them in the same
  folder as `Field2Bill-App.html`, or it will load blank.
- `screenshots/` — product screenshots used on the homepage and ROI page.
- `vercel.json` — static-hosting config.

> Add your own `photo-010.jpg` (Long's headshot) and `favicon.png` to this folder —
> they're referenced by the pages and live on your domain.

## Deploy to Vercel
1. Create a GitHub repo and upload **everything in this folder** (keep the structure —
   `support.js` and `materials-data.js` must sit next to `Field2Bill-App.html`).
   Use **Add file → Upload files** on github.com, then **Commit**.
2. vercel.com → **Add New… → Project** → import the repo.
3. Framework preset: **Other** (static site, no build step) → **Deploy**.

Every push to GitHub redeploys automatically. The "Launch Field2Bill" buttons open
`Field2Bill-App.html` in a new tab. It's a front-end demo — data resets on refresh,
no database yet (that's the future Next.js + Vercel Postgres build).

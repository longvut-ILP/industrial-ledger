# Industrial Ledger Partners — website

Marketing homepage + the embedded **Field2Bill** product demo.

## Files
- `index.html` — homepage (the v2 design, Field2Bill-forward).
- `Field2Bill-App.html` — the live app demo the "Launch Field2Bill" buttons open.
- `screenshots/` — product screenshots used on the homepage.
- `vercel.json` — static-hosting config.

> Add your own `photo-010.jpg` (Long's headshot) and `favicon.png` to this folder —
> they're referenced by the homepage and live on your domain.

## Deploy to Vercel
1. Create a GitHub repo and upload everything in this folder
   (**Add file → Upload files** on github.com, then **Commit**).
2. vercel.com → **Add New… → Project** → import the repo.
3. Framework preset: **Other** (static site, no build step) → **Deploy**.

Every push to GitHub redeploys automatically. The "Launch Field2Bill" buttons open
`Field2Bill-App.html` in a new tab — fully self-contained, no database yet.

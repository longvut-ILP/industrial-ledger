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
`Field2Bill-App.html` in a new tab. With no backend reachable (local preview) it
falls back to demo data; on Vercel it reads/writes Vercel Postgres.

## Multi-tenancy (one private dataset per company)
Every data table carries a `company` tag and the API only ever returns rows for
the signed-in user's company, so adding a second company keeps its crews, jobs,
tickets and invoices completely separate from Scaffold Monkey's.

How it works: `/api/login` returns a **signed token** that encodes the user's
company. The app sends it back as `Authorization: Bearer …` on every request, and
each API verifies the signature server-side — the browser can't change which
company it claims to be. The token lives in `sessionStorage`, so a refresh stays
signed in and scoped to the same company.

### One-time setup
1. Run `schema-additions-3-tenancy.sql` in the Query tab (adds the `company`
   column to every table, backfills existing rows to `Scaffold Monkey Co`, and
   makes the "unique by name" rules unique *per company*).
2. Run `schema-additions-4-equipment.sql` (creates the per-company `equipment`
   table that the Admin → "Add / edit equipment" card reads and writes).
3. In Vercel → Project → Settings → Environment Variables, set **`AUTH_SECRET`**
   to a long random string (this signs the login tokens). Redeploy.

### Onboarding company #2
1. Add their login with `create-user.sql` (set their `company`). Their `company`
   string must exactly match what you tag their data with.
2. They sign in and start adding crews/jobs/tickets — everything is tagged to
   their company automatically. To seed their own materials catalog, run an
   import like `import-materials.sql` with their `company` value in each row.

> ⚠️ The `company` value in `users` must match the data tags exactly (e.g.
> `Scaffold Monkey Co`, no trailing period). The migration backfills existing
> data to `Scaffold Monkey Co` to match `auth-setup.sql`.

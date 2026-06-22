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
- `api/` — Serverless functions (run automatically on Vercel).

> **Vercel Hobby (free) plan note:** Hobby caps a deployment at **12 Serverless
> Functions**, and every file in `api/` counts as one. To stay under the cap, the
> simple per-resource endpoints (crews, customers, employees, equipment, invoices,
> jobs, materials, tickets, users) are all served by a single dynamic file,
> `api/[resource].js`. The public URLs are unchanged — `/api/jobs`,
> `/api/customers`, etc. still work exactly as before. Do not split them back into
> one-file-per-resource unless you're on the Pro plan, or you'll exceed the limit.

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

## Live QuickBooks Online invoicing
Each tenant connects its **own** QuickBooks Online company once, then the
"send to QuickBooks" button on an approved ticket creates a **real invoice**
in that company (creating the customer if it doesn't exist). Tokens are stored
per company, so one tenant can never post into another's books.

> If QuickBooks isn't configured/connected, the app falls back to the demo
> behaviour (a placeholder `QBO-####` number) — nothing breaks.

### One-time setup
1. **Create an Intuit app** at [developer.intuit.com](https://developer.intuit.com)
   → *Dashboard → Create an app → QuickBooks Online and Payments*.
2. In the app's **Keys & credentials**, copy the **Client ID** and **Client Secret**
   (use the *Development* keys to test against a sandbox company, *Production*
   keys for live books — a production app needs Intuit review).
3. Add a **Redirect URI** that exactly matches your domain:
   `https://YOUR-DOMAIN/api/qbo-callback`
4. Run `schema-additions-5-quickbooks.sql` in the Query tab (creates `qbo_tokens`).
5. In Vercel → Project → Settings → **Environment Variables**, set:

   | Variable | Value |
   |---|---|
   | `QBO_CLIENT_ID` | from Intuit |   ABgTTRvHhBUztTDm11gPTvjR2l07oUivtZMpnYsZw5P1JX9ZbG
   | `QBO_CLIENT_SECRET` | from Intuit | EAw7JOkmSQry4VGww4j0sjjKDax0FzTL7MNRlbNV
   | `QBO_REDIRECT_URI` | `https://YOUR-DOMAIN/api/qbo-callback` |  https://www.industrialledger.com/api/qbo-callback
   | `QBO_ENV` | `sandbox` while testing, `production` when live |

   Redeploy after setting them.

### Connecting a company
In the app: **Admin → QuickBooks → Connect to QuickBooks**. A window opens,
the user signs into QuickBooks and approves access, and the connection is saved
for that tenant. From then on, approved tickets bill straight into that company
file. **Disconnect** clears it.

> Must be **QuickBooks Online** (not Desktop). A *QuickBooks Online Accountant*
> login connects to a specific **client company file** — invoices post into the
> company you select during the connect step, not into the accountant login itself.

### API files
- `api/[resource].js` — all tenant data CRUD (crews, customers, employees,
  equipment, invoices, jobs, materials, tickets) + admin `users`, in one function.
- `api/login.js` — issues the signed login token.
- `api/_auth.js` — shared token signing/verification (underscore = not routed).
- `api/_qbo.js` — Intuit OAuth + token refresh + authenticated API calls.
- `api/qbo-connect.js` / `api/qbo-callback.js` — the OAuth handshake.
- `api/qbo-status.js` / `api/qbo-disconnect.js` — connection state.
- `api/qbo-invoice.js` — find/create the customer, then create the invoice.

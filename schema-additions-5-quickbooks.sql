-- ============================================================
-- Field2Bill — schema additions, part 5 (live QuickBooks Online)
-- Run this in the Query tab once. Safe to re-run.
--
-- Stores one QuickBooks Online connection PER COMPANY (tenant).
-- The OAuth tokens are scoped to the signed-in company, so each
-- tenant pushes invoices into ITS OWN QuickBooks company file only.
-- ============================================================

CREATE TABLE IF NOT EXISTS qbo_tokens (
  company           text PRIMARY KEY,        -- tenant (matches users.company)
  realm_id          text NOT NULL,           -- the QuickBooks company file id
  access_token      text NOT NULL,           -- short-lived (~1 hour)
  refresh_token     text NOT NULL,           -- long-lived (~100 days)
  expires_at        timestamptz NOT NULL,    -- when access_token must be refreshed
  qbo_company_name  text,                     -- friendly name for the UI
  updated_at        timestamptz DEFAULT now()
);

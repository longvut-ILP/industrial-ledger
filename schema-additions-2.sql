-- ============================================================
-- Field2Bill — schema additions, part 2 (tickets + invoices)
-- Run this in the Query tab once, after schema-additions.sql.
-- Safe to re-run.
-- ============================================================

-- Tickets: match the app's shape (label id, job by name, amount, invoiced flag)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS label    text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS job_name text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS amount   numeric(12,2) DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS invoiced boolean DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS qbo_num  text;

DO $$ BEGIN
  ALTER TABLE tickets ADD CONSTRAINT tickets_label_unique UNIQUE (label);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invoices: store the full generated rental-invoice record as JSON
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS num  text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS data jsonb;

DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT invoices_num_unique UNIQUE (num);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

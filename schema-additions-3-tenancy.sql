-- ============================================================
-- Field2Bill — schema additions, part 3: MULTI-TENANCY
-- Run this ONCE in the Query tab, after schema-additions-2.sql.
-- Gives every data table a `company` tag and makes the
-- "unique by name" rules unique PER COMPANY instead of globally.
-- Safe to re-run (uses IF NOT EXISTS / guarded constraints).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add the company tag to every tenant-scoped table.
-- ------------------------------------------------------------
ALTER TABLE crews     ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE jobs      ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE tickets   ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE invoices  ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS company text;

-- ------------------------------------------------------------
-- 2. Backfill all existing rows to the first tenant.
--    This MUST match users.company exactly (see auth-setup.sql).
-- ------------------------------------------------------------
UPDATE crews     SET company = 'Scaffold Monkey Co' WHERE company IS NULL;
UPDATE employees SET company = 'Scaffold Monkey Co' WHERE company IS NULL;
UPDATE jobs      SET company = 'Scaffold Monkey Co' WHERE company IS NULL;
UPDATE tickets   SET company = 'Scaffold Monkey Co' WHERE company IS NULL;
UPDATE invoices  SET company = 'Scaffold Monkey Co' WHERE company IS NULL;
UPDATE customers SET company = 'Scaffold Monkey Co' WHERE company IS NULL;
UPDATE materials SET company = 'Scaffold Monkey Co' WHERE company IS NULL;

-- ------------------------------------------------------------
-- 3. Require the tag going forward, so no row can be "untagged".
-- ------------------------------------------------------------
ALTER TABLE crews     ALTER COLUMN company SET NOT NULL;
ALTER TABLE employees ALTER COLUMN company SET NOT NULL;
ALTER TABLE jobs      ALTER COLUMN company SET NOT NULL;
ALTER TABLE tickets   ALTER COLUMN company SET NOT NULL;
ALTER TABLE invoices  ALTER COLUMN company SET NOT NULL;
ALTER TABLE customers ALTER COLUMN company SET NOT NULL;
ALTER TABLE materials ALTER COLUMN company SET NOT NULL;

-- ------------------------------------------------------------
-- 4. Swap the GLOBAL unique constraints for PER-COMPANY ones.
--    (Two companies can now both have a crew named "Day Shift",
--     a ticket label TCK-9024, an invoice INV-001, etc.)
-- ------------------------------------------------------------
ALTER TABLE crews     DROP CONSTRAINT IF EXISTS crews_name_unique;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_name_unique;
ALTER TABLE jobs      DROP CONSTRAINT IF EXISTS jobs_name_unique;
ALTER TABLE tickets   DROP CONSTRAINT IF EXISTS tickets_label_unique;
ALTER TABLE invoices  DROP CONSTRAINT IF EXISTS invoices_num_unique;

DO $$ BEGIN
  ALTER TABLE crews ADD CONSTRAINT crews_company_name_unique UNIQUE (company, name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE employees ADD CONSTRAINT employees_company_name_unique UNIQUE (company, name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD CONSTRAINT jobs_company_name_unique UNIQUE (company, name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tickets ADD CONSTRAINT tickets_company_label_unique UNIQUE (company, label);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT invoices_company_num_unique UNIQUE (company, num);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- 5. Materials: catalog code is unique per company.
--    If your base schema made `code` a PRIMARY KEY or globally
--    unique, drop that here so a 2nd company can have the same
--    codes. (Adjust the constraint name if yours differs.)
-- ------------------------------------------------------------
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_code_key;
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_code_unique;

DO $$ BEGIN
  ALTER TABLE materials ADD CONSTRAINT materials_company_code_unique UNIQUE (company, code);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- 6. Helpful indexes for the per-company list queries.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_crews_company     ON crews (company);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees (company);
CREATE INDEX IF NOT EXISTS idx_jobs_company      ON jobs (company);
CREATE INDEX IF NOT EXISTS idx_tickets_company   ON tickets (company);
CREATE INDEX IF NOT EXISTS idx_invoices_company  ON invoices (company);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers (company);
CREATE INDEX IF NOT EXISTS idx_materials_company ON materials (company);

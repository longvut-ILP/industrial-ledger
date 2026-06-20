-- ============================================================
-- Field2Bill — schema additions
-- Run this AFTER the main schema, BEFORE using the app's APIs.
-- These add the columns/constraints the /api functions rely on.
-- Safe to re-run (uses IF NOT EXISTS / guarded constraints).
-- ============================================================

-- crews: store assigned members + equipment directly on the row,
-- and make name unique so POST can upsert by name.
ALTER TABLE crews ADD COLUMN IF NOT EXISTS members   jsonb DEFAULT '[]';
ALTER TABLE crews ADD COLUMN IF NOT EXISTS equipment jsonb DEFAULT '[]';

DO $$ BEGIN
  ALTER TABLE crews ADD CONSTRAINT crews_name_unique UNIQUE (name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- employees: certifications as JSON + unique name for upsert.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS certs jsonb DEFAULT '[]';

DO $$ BEGIN
  ALTER TABLE employees ADD CONSTRAINT employees_name_unique UNIQUE (name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- jobs: unique name for upsert.
DO $$ BEGIN
  ALTER TABLE jobs ADD CONSTRAINT jobs_name_unique UNIQUE (name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Field2Bill — schema additions, part 4: EQUIPMENT master data
-- Run this ONCE in the Query tab, after schema-additions-3-tenancy.sql.
-- Equipment is its own per-company table so each company manages its
-- own fleet (and crews/tickets reference it by name). Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS equipment (
  id         SERIAL PRIMARY KEY,
  company    text NOT NULL,
  name       text NOT NULL,
  type       text DEFAULT 'General',
  created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE equipment ADD CONSTRAINT equipment_company_name_unique UNIQUE (company, name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment (company);

-- Seed Scaffold Monkey's current fleet (matches the app's defaults).
INSERT INTO equipment (company, name, type) VALUES
  ('Scaffold Monkey Co', 'Excavator (Unit #402)',     'Heavy'),
  ('Scaffold Monkey Co', 'Hydrovac Truck (Unit #811)', 'Vac'),
  ('Scaffold Monkey Co', 'Skid Steer (Unit #203)',     'Compact')
ON CONFLICT (company, name) DO NOTHING;

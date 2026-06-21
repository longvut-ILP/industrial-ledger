-- ============================================================
-- Field2Bill — authentication setup
-- Run this ONCE in the Query tab.
-- Passwords are hashed with bcrypt (via pgcrypto) — never stored as plain text.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  company       TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT DEFAULT 'Owner / Admin',
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- First user: Scaffold Monkey Co.
-- 👉 EDIT the email and the password ('ChangeMe123!') before running.
-- ------------------------------------------------------------
INSERT INTO users (company, email, password_hash, role)
VALUES (
  'Scaffold Monkey Co',
  'admin@scaffoldmonkey.com',
  crypt('ChangeMe123!', gen_salt('bf')),
  'Owner / Admin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Field2Bill — create a new user (reusable)
-- Copy this, change the 4 values, paste into the Query tab, Run.
-- The password is bcrypt-hashed automatically by crypt()/gen_salt('bf').
-- ============================================================

INSERT INTO users (company, email, password_hash, role)
VALUES (
  'Company Name Here',                 -- company
  'person@company.com',                -- login email (lowercase)
  crypt('TheirPassword!', gen_salt('bf')),  -- password (typed once, stored hashed)
  'Owner / Admin'                      -- role: 'Owner / Admin', 'Operations Lead', 'Billing / Accounting', or 'Field Crew'
)
ON CONFLICT (email) DO UPDATE
  SET company = EXCLUDED.company,
      password_hash = EXCLUDED.password_hash,  -- re-running resets the password
      role = EXCLUDED.role;

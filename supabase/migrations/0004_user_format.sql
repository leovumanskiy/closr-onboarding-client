-- Rename columns to match new user format
ALTER TABLE clients RENAME COLUMN display_name TO full_name;
ALTER TABLE clients RENAME COLUMN company_name TO business_name;

-- Add new profile fields
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS business_website text,
  ADD COLUMN IF NOT EXISTS niche            text,
  ADD COLUMN IF NOT EXISTS start_date       date,
  ADD COLUMN IF NOT EXISTS image_url        text;

-- Email is now the login identifier — enforce uniqueness
ALTER TABLE clients ALTER COLUMN email SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clients_email_key ON clients (lower(email));

-- Drop username (replaced by email as login key)
ALTER TABLE clients DROP COLUMN IF EXISTS username;

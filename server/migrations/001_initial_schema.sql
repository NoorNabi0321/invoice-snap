-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────
-- ENUM
-- ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            VARCHAR(255) NOT NULL UNIQUE,
  password_hash    TEXT         NOT NULL,
  business_name    VARCHAR(255),
  business_email   VARCHAR(255),
  business_address TEXT,
  business_phone   VARCHAR(50),
  logo_url         TEXT,
  currency         VARCHAR(10)  NOT NULL DEFAULT 'USD',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  phone      VARCHAR(50),
  address    TEXT,
  city       VARCHAR(100),
  country    VARCHAR(100),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- ─────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id        UUID           NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  invoice_number   VARCHAR(20)    NOT NULL,
  status           invoice_status NOT NULL DEFAULT 'draft',
  issue_date       DATE           NOT NULL,
  due_date         DATE           NOT NULL,
  subtotal         INTEGER        NOT NULL DEFAULT 0,  -- cents
  tax_rate         NUMERIC(5,2)   NOT NULL DEFAULT 0,  -- percentage e.g. 10.00
  tax_amount       INTEGER        NOT NULL DEFAULT 0,  -- cents
  discount_percent NUMERIC(5,2)   NOT NULL DEFAULT 0,
  discount_amount  INTEGER        NOT NULL DEFAULT 0,  -- cents
  total            INTEGER        NOT NULL DEFAULT 0,  -- cents
  notes            TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id   ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status);

-- ─────────────────────────────────────────
-- INVOICE ITEMS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT         NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL DEFAULT 1,
  rate        INTEGER      NOT NULL DEFAULT 0,  -- cents
  amount      INTEGER      NOT NULL DEFAULT 0,  -- cents (quantity * rate)
  sort_order  INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- ─────────────────────────────────────────
-- updated_at TRIGGER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

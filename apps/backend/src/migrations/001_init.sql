CREATE TABLE IF NOT EXISTS stores (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS machines (
  id text PRIMARY KEY,
  store_id text NOT NULL REFERENCES stores(id),
  kind text NOT NULL CHECK (kind IN ('WASHER','DRYER')),
  label text NOT NULL,
  channel integer NOT NULL CHECK (channel BETWEEN 1 AND 1000),
  device_id text NOT NULL,
  price_override_cents integer CHECK (price_override_cents IS NULL OR price_override_cents >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, label)
);

CREATE TABLE IF NOT EXISTS prices (
  id text PRIMARY KEY,
  store_id text NOT NULL REFERENCES stores(id),
  kind text NOT NULL CHECK (kind IN ('WASHER','DRYER')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, kind)
);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  store_id text NOT NULL REFERENCES stores(id),
  status text NOT NULL CHECK (status IN ('PENDING','PAID','CANCELED')),
  total_cents integer NOT NULL,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id),
  machine_id text NOT NULL REFERENCES machines(id),
  kind text NOT NULL,
  price_cents integer NOT NULL,
  UNIQUE (order_id, machine_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id),
  provider text NOT NULL,
  external_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('APPROVED','DECLINED','ERROR')),
  method text,
  amount_cents integer NOT NULL,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE TABLE IF NOT EXISTS release_commands (
  id text PRIMARY KEY,
  order_item_id text UNIQUE,
  order_id text NOT NULL REFERENCES orders(id),
  store_id text NOT NULL REFERENCES stores(id),
  machine_id text NOT NULL REFERENCES machines(id),
  device_id text NOT NULL,
  channel integer NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDING','SENT','DONE','UNCONFIRMED','FAILED','EXPIRED')),
  attempts integer NOT NULL DEFAULT 0,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS release_events (
  id text PRIMARY KEY,
  command_id text NOT NULL REFERENCES release_commands(id),
  type text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders (store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_commands_status ON release_commands (status);
CREATE INDEX IF NOT EXISTS idx_events_command ON release_events (command_id);

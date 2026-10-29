CREATE TABLE IF NOT EXISTS vouchers (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  store_id text NOT NULL REFERENCES stores(id),
  category text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  balance_cents integer NOT NULL CHECK (balance_cents >= 0),
  recurring boolean NOT NULL DEFAULT false,
  valid_from text,
  valid_to text,
  restrict_store boolean NOT NULL DEFAULT false,
  restrict_store_id text REFERENCES stores(id),
  store_value_limit_cents integer,
  store_usage_limit integer,
  restrict_customer boolean NOT NULL DEFAULT false,
  customer_id text REFERENCES customers(id),
  customer_value_limit_cents integer,
  customer_usage_limit integer,
  restrict_service boolean NOT NULL DEFAULT false,
  service text CHECK (service IS NULL OR service IN ('WASHER', 'DRYER')),
  service_value_limit_cents integer,
  service_usage_limit integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id text PRIMARY KEY,
  voucher_id text NOT NULL REFERENCES vouchers(id),
  store_id text NOT NULL REFERENCES stores(id),
  customer_id text,
  service text,
  purchase_cents integer NOT NULL,
  discount_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

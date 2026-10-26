CREATE TABLE IF NOT EXISTS devices (
  device_id text PRIMARY KEY,
  name text,
  store_id text REFERENCES stores(id),
  kind text CHECK (kind IS NULL OR kind IN ('WASHER','DRYER')),
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz,
  info text
);

ALTER TABLE release_commands DROP CONSTRAINT IF EXISTS release_commands_order_item_id_fkey;
-- Liberações manuais usam order_item_id = 'manual:<id>' (sem pedido); a FK foi removida e o UNIQUE mantido.
ALTER TABLE release_commands ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE release_commands ALTER COLUMN store_id DROP NOT NULL;
ALTER TABLE release_commands ALTER COLUMN machine_id DROP NOT NULL;
ALTER TABLE release_commands ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'ORDER';

ALTER TABLE machines ADD COLUMN IF NOT EXISTS code text;
CREATE UNIQUE INDEX IF NOT EXISTS machines_store_code_uidx ON machines (store_id, code);

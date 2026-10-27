ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_id text REFERENCES stores(id);

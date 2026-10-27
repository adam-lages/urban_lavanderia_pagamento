ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id text REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_code text;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS auth_code text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_brand text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_number text;

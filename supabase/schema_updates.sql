-- StockAgence — upgrades seulement (si ancienne base déjà créée)
-- Pour une NOUVELLE installation, utilisez schema.sql à la place.

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'Standard';
ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_price numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS maximum_price numeric;

ALTER TABLE product_requests ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE product_requests ADD COLUMN IF NOT EXISTS rejection_reason_code text;

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_role text;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS agency_id integer;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS agency_name text;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS quantity numeric;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS previous_value text;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS new_value text;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS rejection_reason text;

UPDATE products SET product_type = 'Standard' WHERE product_type IS NULL OR product_type = '';

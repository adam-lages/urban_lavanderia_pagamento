ALTER TABLE machines ADD COLUMN IF NOT EXISTS cycle_minutes integer;
UPDATE machines SET cycle_minutes = CASE WHEN kind = 'DRYER' THEN 45 ELSE 30 END WHERE cycle_minutes IS NULL;
ALTER TABLE machines ALTER COLUMN cycle_minutes SET NOT NULL;

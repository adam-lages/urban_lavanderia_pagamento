ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_channel_check;
ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_channel_range;
ALTER TABLE machines ADD CONSTRAINT machines_channel_range CHECK (channel BETWEEN 1 AND 1000);

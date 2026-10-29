CREATE TABLE IF NOT EXISTS device_presence_events (
  id text PRIMARY KEY,
  device_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('online','offline')),
  at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS device_presence_events_device_at ON device_presence_events (device_id, at);

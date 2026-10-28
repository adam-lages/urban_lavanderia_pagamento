CREATE TABLE IF NOT EXISTS price_schedules (
  id text PRIMARY KEY,
  machine_id text NOT NULL REFERENCES machines(id),
  start_time text NOT NULL,
  end_time text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  weekdays text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

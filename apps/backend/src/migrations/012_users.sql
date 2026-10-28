CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('FRANQUIA','FRANQUEADO')),
  created_at timestamptz NOT NULL DEFAULT now()
);

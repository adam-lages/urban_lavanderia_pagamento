CREATE TABLE IF NOT EXISTS customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  birth_date date NOT NULL,
  cpf text NOT NULL UNIQUE,
  email text NOT NULL,
  phone text NOT NULL,
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

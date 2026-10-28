import { randomUUID } from "node:crypto";
import { hashPassword, signSession, verifyPassword, type Role } from "../auth.js";
import type { Queryable } from "../db.js";
import { HttpError } from "../errors.js";

export const SEED_FRANQUIA_EMAIL = "adamflages@gmail.com";
export const SEED_FRANQUIA_PASSWORD = "@Hoje123@";

export interface PublicUser {
  id: string;
  email: string;
  role: Role;
}

export async function seedDefaultUsers(db: Queryable): Promise<void> {
  const email = SEED_FRANQUIA_EMAIL;
  const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows[0]) return;
  await db.query("INSERT INTO users (id, email, password_hash, role, created_at) VALUES ($1,$2,$3,$4,now())", [
    randomUUID(),
    email,
    await hashPassword(SEED_FRANQUIA_PASSWORD),
    "FRANQUIA",
  ]);
}

export async function login(
  db: Queryable,
  secret: string,
  emailRaw: string,
  password: string,
): Promise<{ token: string; user: PublicUser }> {
  const email = emailRaw.trim().toLowerCase();
  const row = (await db.query("SELECT id, email, password_hash, role FROM users WHERE email = $1", [email])).rows[0];
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw new HttpError(401, "E-mail ou senha inválidos", "invalid_credentials");
  }
  const user: PublicUser = { id: row.id, email: row.email, role: row.role };
  return { token: signSession(secret, user), user };
}

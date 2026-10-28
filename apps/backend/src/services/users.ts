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

export const MIN_PASSWORD_LENGTH = 8;

export interface StoreLogin {
  email?: string;
  password?: string;
}

export async function franchiseEmail(db: Queryable): Promise<string> {
  const { rows } = await db.query(
    "SELECT email FROM users WHERE role = 'FRANQUIA' ORDER BY created_at LIMIT 1",
  );
  return rows[0]?.email ?? SEED_FRANQUIA_EMAIL;
}

export async function assertStoreLoginValid(db: Queryable, login: StoreLogin, storeId?: string): Promise<void> {
  const email = login.email?.trim().toLowerCase();
  const cur = storeId ? (await db.query("SELECT id FROM users WHERE store_id = $1", [storeId])).rows[0] : undefined;
  if (email) {
    const taken = (await db.query("SELECT id FROM users WHERE email = $1", [email])).rows[0];
    if (taken && taken.id !== cur?.id) throw new HttpError(409, "Este e-mail já é usado por outro acesso", "conflict");
    if (!cur && !login.password) throw new HttpError(400, "Informe a senha de acesso", "login_password_required");
  } else if (login.password && !cur) {
    throw new HttpError(400, "Informe o e-mail de acesso", "login_email_required");
  }
}

export async function saveStoreLogin(db: Queryable, storeId: string, role: Role, login: StoreLogin): Promise<void> {
  const cur = (await db.query("SELECT id, email FROM users WHERE store_id = $1", [storeId])).rows[0];
  const email = login.email?.trim().toLowerCase() || cur?.email;
  if (!email) {
    if (login.password) throw new HttpError(400, "Informe o e-mail de acesso", "login_email_required");
    return;
  }
  const taken = (await db.query("SELECT id FROM users WHERE email = $1", [email])).rows[0];
  if (taken && taken.id !== cur?.id) throw new HttpError(409, "Este e-mail já é usado por outro acesso", "conflict");
  if (!cur) {
    if (!login.password) throw new HttpError(400, "Informe a senha de acesso", "login_password_required");
    await db.query("INSERT INTO users (id, email, password_hash, role, store_id, created_at) VALUES ($1,$2,$3,$4,$5,now())", [
      randomUUID(), email, await hashPassword(login.password), role, storeId,
    ]);
    return;
  }
  const hash = login.password ? await hashPassword(login.password) : null;
  await db.query("UPDATE users SET email = $2, role = $3, password_hash = COALESCE($4, password_hash) WHERE id = $1", [
    cur.id, email, role, hash,
  ]);
}

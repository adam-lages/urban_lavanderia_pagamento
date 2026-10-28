import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request } from "express";

const scryptAsync = promisify(scrypt);
const KEYLEN = 32;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const ROLES = ["FRANQUIA", "FRANQUEADO"] as const;
export type Role = (typeof ROLES)[number];

export interface Session {
  id: string;
  email: string;
  role: Role;
  exp: number;
}

export type AuthedRequest = Request & { user?: Session };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signSession(secret: string, session: Omit<Session, "exp">, ttlMs = SESSION_TTL_MS): string {
  const body = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + ttlMs })).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `ulv1.${body}.${sig}`;
}

export function verifySession(secret: string, token: string): Session | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "ulv1") return null;
  const body = parts[1]!;
  const sig = parts[2]!;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const session = JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
    if (session.exp < Date.now()) return null;
    if (session.role !== "FRANQUIA" && session.role !== "FRANQUEADO") return null;
    if (!session.id || !session.email) return null;
    return session;
  } catch {
    return null;
  }
}

export function resolveAuth(token: string, adminToken: string): Session | null {
  if (token && token === adminToken) {
    return { id: "admin-token", email: "admin@local", role: "FRANQUIA", exp: Number.MAX_SAFE_INTEGER };
  }
  return verifySession(adminToken, token);
}

export function setUser(req: Request, user: Session) {
  (req as AuthedRequest).user = user;
}

export function userOf(req: Request): Session | undefined {
  return (req as AuthedRequest).user;
}

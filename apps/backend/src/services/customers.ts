import type { Db } from "../db.js";
import { HttpError } from "../errors.js";

export interface Customer {
  id: string;
  name: string;
  birthDate: string;
  age: number;
  cpf: string;
  email: string;
  phone: string;
  blocked: boolean;
  storeId: string;
  storeName: string;
  createdAt: string;
}

export function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function ageOn(birth: Date, now = new Date()) {
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function parseDay(value: Date | string) {
  if (typeof value === "string") {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function isoDate(value: Date | string) {
  const d = parseDay(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function mapCustomer(r: any, now = new Date()): Customer {
  const birth = parseDay(r.birth_date);
  return {
    id: r.id,
    name: r.name,
    birthDate: isoDate(r.birth_date),
    age: ageOn(birth, now),
    cpf: r.cpf,
    email: r.email,
    phone: r.phone,
    blocked: Boolean(r.blocked),
    storeId: r.store_id ?? "",
    storeName: r.store_name ?? "",
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

const SELECT = "SELECT c.*, s.name AS store_name FROM customers c LEFT JOIN stores s ON s.id = c.store_id";

export class CustomerService {
  constructor(private db: Db, private now: () => Date = () => new Date()) {}

  async list(input: { name?: string; cpf?: string; storeId?: string; page: number; limit: number }) {
    const name = input.name?.trim() || "";
    const storeId = input.storeId?.trim() || "";
    const cpf = digits(input.cpf ?? "");
    const limit = input.limit;
    const offset = input.page * limit;
    const where: string[] = [];
    const params: unknown[] = [];
    if (name) {
      params.push(`%${name}%`);
      where.push(`c.name ILIKE $${params.length}`);
    }
    if (cpf) {
      params.push(`%${cpf}%`);
      where.push(`c.cpf LIKE $${params.length}`);
    }
    if (storeId) {
      params.push(storeId);
      where.push(`c.store_id = $${params.length}`);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = Number((await this.db.query(`SELECT COUNT(*) AS n FROM customers c ${clause}`, params)).rows[0]?.n ?? 0);
    params.push(limit, offset);
    const { rows } = await this.db.query(
      `${SELECT} ${clause} ORDER BY c.name LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const now = this.now();
    return { items: rows.map((r) => mapCustomer(r, now)), total };
  }

  async get(id: string) {
    const { rows } = await this.db.query(`${SELECT} WHERE c.id = $1`, [id]);
    if (!rows[0]) throw new HttpError(404, "Cliente não encontrado", "not_found");
    return mapCustomer(rows[0], this.now());
  }

  async setBlocked(id: string, blocked: boolean) {
    await this.get(id);
    await this.db.query("UPDATE customers SET blocked = $2 WHERE id = $1", [id, blocked]);
    return this.get(id);
  }
}

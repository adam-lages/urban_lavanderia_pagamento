import { randomUUID } from "node:crypto";
import type { Role } from "../auth.js";
import { cnpjDigits, isValidCnpj } from "../cnpj.js";
import type { Db } from "../db.js";
import { HttpError } from "../errors.js";

export interface StoreRow {
  id: string;
  name: string;
  legalName: string;
  code: string;
  address: string;
  cnpj: string;
  role: Role;
  active: boolean;
}

export function mapStore(r: any): StoreRow {
  return {
    id: r.id,
    name: r.name,
    legalName: r.legal_name ?? "",
    code: r.code,
    address: r.address ?? "",
    cnpj: r.cnpj ?? "",
    role: r.role,
    active: r.active,
  };
}

export interface StorePatch {
  name?: string;
  legalName?: string;
  code?: string;
  address?: string;
  cnpj?: string;
  role?: Role;
  active?: boolean;
}

export interface StoreInput extends StorePatch {
  name: string;
  legalName: string;
  cnpj: string;
  role: Role;
}

export const STORE_CODE = /^\d{8}$/;
export const MACHINE_CODE = /^\d{6}$/;

export function randomDigitCode(length: number) {
  const min = 10 ** (length - 1);
  return String(min + Math.floor(Math.random() * 9 * min));
}

function requireCnpj(value: string) {
  const digits = cnpjDigits(value);
  if (!isValidCnpj(digits)) throw new HttpError(400, "CNPJ inválido", "invalid_cnpj");
  return digits;
}

export class StoreService {
  constructor(private db: Db) {}

  async list() {
    const { rows } = await this.db.query("SELECT * FROM stores ORDER BY name");
    return rows.map(mapStore);
  }

  async get(id: string) {
    const { rows } = await this.db.query("SELECT * FROM stores WHERE id = $1", [id]);
    if (!rows[0]) throw new HttpError(404, "Lavanderia não encontrada", "not_found");
    return mapStore(rows[0]);
  }

  async uniqueCode(preferred?: string) {
    if (preferred) {
      const taken = (await this.db.query("SELECT 1 FROM stores WHERE code = $1", [preferred])).rows[0];
      if (taken) throw new HttpError(409, "Já existe uma lavanderia com este código", "conflict");
      return preferred;
    }
    for (let i = 0; i < 30; i++) {
      const code = randomDigitCode(8);
      const taken = (await this.db.query("SELECT 1 FROM stores WHERE code = $1", [code])).rows[0];
      if (!taken) return code;
    }
    throw new HttpError(500, "Não foi possível gerar um código único", "code_exhausted");
  }

  private async assertCnpjFree(cnpj: string, exceptId?: string) {
    const { rows } = await this.db.query("SELECT id, name FROM stores WHERE cnpj = $1", [cnpj]);
    const taken = rows.find((r) => r.id !== exceptId);
    if (taken) throw new HttpError(409, `Já existe uma lavanderia com este CNPJ (${taken.name}).`, "conflict");
  }

  async create(input: StoreInput) {
    const id = randomUUID();
    const code = await this.uniqueCode(input.code?.trim() || undefined);
    const cnpj = requireCnpj(input.cnpj);
    await this.assertCnpjFree(cnpj);
    await this.db.query(
      "INSERT INTO stores (id, name, legal_name, code, address, cnpj, role, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, input.name, input.legalName, code, input.address?.trim() ?? "", cnpj, input.role, new Date()],
    );
    return this.get(id);
  }

  async update(id: string, input: StorePatch) {
    const cur = await this.get(id);
    const cnpj = input.cnpj !== undefined ? requireCnpj(input.cnpj) : cur.cnpj;
    if (cnpj !== cur.cnpj) await this.assertCnpjFree(cnpj, id);
    const { rows } = await this.db.query(
      `UPDATE stores SET
         name = COALESCE($2, name),
         address = COALESCE($3, address),
         cnpj = $4,
         role = COALESCE($5, role),
         active = COALESCE($6, active),
         legal_name = COALESCE($7, legal_name)
       WHERE id = $1 RETURNING *`,
      [id, input.name ?? null, input.address ?? null, cnpj, input.role ?? null, input.active ?? null, input.legalName ?? null],
    );
    if (!rows[0]) throw new HttpError(404, "Lavanderia não encontrada", "not_found");
    return mapStore(rows[0]);
  }

  async remove(id: string) {
    await this.get(id);
    const orders = await this.db.query("SELECT 1 FROM orders WHERE store_id = $1 LIMIT 1", [id]);
    if (orders.rows[0]) {
      throw new HttpError(409, "Não é possível excluir: esta lavanderia já tem vendas.", "conflict");
    }
    const cmds = await this.db.query("SELECT 1 FROM release_commands WHERE store_id = $1 LIMIT 1", [id]);
    if (cmds.rows[0]) {
      throw new HttpError(409, "Não é possível excluir: há liberações vinculadas a esta lavanderia.", "conflict");
    }
    await this.db.tx(async (q) => {
      await q.query("UPDATE devices SET store_id = NULL WHERE store_id = $1", [id]);
      await q.query("DELETE FROM prices WHERE store_id = $1", [id]);
      await q.query("DELETE FROM machines WHERE store_id = $1", [id]);
      await q.query("DELETE FROM stores WHERE id = $1", [id]);
    });
  }
}

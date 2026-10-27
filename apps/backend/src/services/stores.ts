import { randomUUID } from "node:crypto";
import type { Db } from "../db.js";
import { HttpError } from "../errors.js";

export interface StoreRow {
  id: string;
  name: string;
  code: string;
  address: string;
  active: boolean;
}

export function mapStore(r: any): StoreRow {
  return { id: r.id, name: r.name, code: r.code, address: r.address ?? "", active: r.active };
}

export interface StorePatch {
  name?: string;
  code?: string;
  address?: string;
  active?: boolean;
}

export interface StoreInput extends StorePatch {
  name: string;
}

export const STORE_CODE = /^\d{8}$/;
export const MACHINE_CODE = /^\d{6}$/;

export function randomDigitCode(length: number) {
  const min = 10 ** (length - 1);
  return String(min + Math.floor(Math.random() * 9 * min));
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

  async create(input: StoreInput) {
    const id = randomUUID();
    const code = input.code?.trim() || randomDigitCode(8);
    await this.db.query("INSERT INTO stores (id, name, code, address, created_at) VALUES ($1,$2,$3,$4,$5)", [
      id,
      input.name,
      code,
      input.address?.trim() ?? "",
      new Date(),
    ]);
    return this.get(id);
  }

  async update(id: string, input: StorePatch) {
    const { rows } = await this.db.query(
      `UPDATE stores SET
         name = COALESCE($2, name),
         address = COALESCE($3, address),
         active = COALESCE($4, active)
       WHERE id = $1 RETURNING *`,
      [id, input.name ?? null, input.address ?? null, input.active ?? null],
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

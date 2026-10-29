import { randomUUID } from "node:crypto";
import type { Db, Queryable } from "../db.js";
import { HttpError } from "../errors.js";
import { normalizeCode } from "./coupons.js";

export const VOUCHER_CATEGORIES = ["CREDITO", "CORTESIA", "REEMBOLSO", "PROMOCIONAL"] as const;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Service = "WASHER" | "DRYER";

export interface VoucherInput {
  storeId: string;
  category: (typeof VOUCHER_CATEGORIES)[number];
  amountCents: number;
  recurring?: boolean;
  validFrom?: string;
  validTo?: string;
  restrictStore?: boolean;
  restrictStoreId?: string;
  storeValueLimitCents?: number | null;
  storeUsageLimit?: number | null;
  restrictCustomer?: boolean;
  customerId?: string;
  customerValueLimitCents?: number | null;
  customerUsageLimit?: number | null;
  restrictService?: boolean;
  service?: Service | "";
  serviceValueLimitCents?: number | null;
  serviceUsageLimit?: number | null;
}

export interface RedeemInput {
  code: string;
  storeId: string;
  purchaseCents: number;
  customerId?: string;
  service?: Service;
  today: string;
}

const SELECT = `
  SELECT v.*, s.name AS store_name, s.role AS store_role,
    rs.name AS restrict_store_name, cu.name AS customer_name,
    COALESCE(u.n, 0) AS uses
  FROM vouchers v
  JOIN stores s ON s.id = v.store_id
  LEFT JOIN (SELECT voucher_id, COUNT(*) AS n FROM voucher_redemptions GROUP BY voucher_id) u ON u.voucher_id = v.id
  LEFT JOIN stores rs ON rs.id = v.restrict_store_id
  LEFT JOIN customers cu ON cu.id = v.customer_id
`;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function mapVoucher(r: any) {
  return {
    id: r.id,
    code: r.code,
    storeId: r.store_id,
    storeName: r.store_name ?? "",
    storeRole: r.store_role ?? "",
    category: r.category,
    amountCents: Number(r.amount_cents),
    balanceCents: Number(r.balance_cents),
    uses: Number(r.uses ?? 0),
    recurring: Boolean(r.recurring),
    validFrom: r.valid_from ?? "",
    validTo: r.valid_to ?? "",
    restrictStore: Boolean(r.restrict_store),
    restrictStoreId: r.restrict_store_id ?? "",
    restrictStoreName: r.restrict_store_name ?? "",
    storeValueLimitCents: num(r.store_value_limit_cents),
    storeUsageLimit: num(r.store_usage_limit),
    restrictCustomer: Boolean(r.restrict_customer),
    customerId: r.customer_id ?? "",
    customerName: r.customer_name ?? "",
    customerValueLimitCents: num(r.customer_value_limit_cents),
    customerUsageLimit: num(r.customer_usage_limit),
    restrictService: Boolean(r.restrict_service),
    service: r.service ?? "",
    serviceValueLimitCents: num(r.service_value_limit_cents),
    serviceUsageLimit: num(r.service_usage_limit),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

function randomCode() {
  let out = "VC";
  for (let i = 0; i < 8; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

function minOf(...values: Array<number | null>) {
  return Math.min(...values.filter((v): v is number => v !== null));
}

export class VoucherService {
  constructor(private db: Db) {}

  private async uniqueCode() {
    for (let i = 0; i < 30; i++) {
      const code = randomCode();
      const taken = (await this.db.query("SELECT 1 FROM vouchers WHERE code = $1", [code])).rows[0];
      if (!taken) return code;
    }
    throw new HttpError(500, "Não foi possível gerar um código único", "code_exhausted");
  }

  async get(id: string) {
    const { rows } = await this.db.query(`${SELECT} WHERE v.id = $1`, [id]);
    if (!rows[0]) throw new HttpError(404, "Voucher não encontrado", "not_found");
    return mapVoucher(rows[0]);
  }

  async list(input: { storeId?: string; code?: string; page: number; limit: number }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (input.storeId) {
      params.push(input.storeId);
      where.push(`(v.store_id = $${params.length} OR (v.restrict_store AND v.restrict_store_id = $${params.length}))`);
    }
    const code = normalizeCode(input.code ?? "");
    if (code) {
      params.push(`%${code}%`);
      where.push(`v.code LIKE $${params.length}`);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = Number((await this.db.query(`SELECT COUNT(*) AS n FROM vouchers v ${clause}`, params)).rows[0]?.n ?? 0);
    params.push(input.limit, input.page * input.limit);
    const { rows } = await this.db.query(
      `${SELECT} ${clause} ORDER BY v.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items: rows.map(mapVoucher), total };
  }

  private async assertRefs(input: VoucherInput) {
    const store = (await this.db.query("SELECT id FROM stores WHERE id = $1", [input.storeId])).rows[0];
    if (!store) throw new HttpError(400, "Lavanderia não encontrada", "invalid_store");
    if (input.validFrom && input.validTo && input.validFrom > input.validTo) {
      throw new HttpError(400, "A validade inicial não pode ser depois da final", "invalid_period");
    }
    if (input.restrictStore && !input.restrictStoreId) throw new HttpError(400, "Informe a lavanderia da restrição", "invalid_restrict_store");
    if (input.restrictService && !input.service) throw new HttpError(400, "Informe o serviço", "invalid_service");
    if (input.restrictCustomer && input.customerId) {
      const cu = (await this.db.query("SELECT id FROM customers WHERE id = $1", [input.customerId])).rows[0];
      if (!cu) throw new HttpError(400, "Cliente não encontrado", "invalid_customer");
    }
  }

  private restrictions(input: VoucherInput) {
    return [
      Boolean(input.recurring), input.validFrom || null, input.validTo || null,
      Boolean(input.restrictStore), input.restrictStore ? input.restrictStoreId || null : null,
      input.restrictStore ? input.storeValueLimitCents ?? null : null,
      input.restrictStore ? input.storeUsageLimit ?? null : null,
      Boolean(input.restrictCustomer), input.restrictCustomer ? input.customerId || null : null,
      input.restrictCustomer ? input.customerValueLimitCents ?? null : null,
      input.restrictCustomer ? input.customerUsageLimit ?? null : null,
      Boolean(input.restrictService), input.restrictService ? input.service || null : null,
      input.restrictService ? input.serviceValueLimitCents ?? null : null,
      input.restrictService ? input.serviceUsageLimit ?? null : null,
    ];
  }

  async create(input: VoucherInput) {
    await this.assertRefs(input);
    const id = randomUUID();
    const code = await this.uniqueCode();
    await this.db.query(
      `INSERT INTO vouchers (
        id, code, store_id, category, amount_cents, balance_cents,
        recurring, valid_from, valid_to, restrict_store, restrict_store_id, store_value_limit_cents, store_usage_limit,
        restrict_customer, customer_id, customer_value_limit_cents, customer_usage_limit,
        restrict_service, service, service_value_limit_cents, service_usage_limit
      ) VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [id, code, input.storeId, input.category, input.amountCents, ...this.restrictions(input)],
    );
    return this.get(id);
  }

  async update(id: string, input: VoucherInput) {
    const current = await this.get(id);
    await this.assertRefs(input);
    const used = current.amountCents - current.balanceCents;
    if (input.amountCents < used) {
      throw new HttpError(400, "O valor não pode ser menor que o já utilizado", "invalid_amount");
    }
    await this.db.query(
      `UPDATE vouchers SET
        store_id=$2, category=$3, amount_cents=$4, balance_cents=$5,
        recurring=$6, valid_from=$7, valid_to=$8, restrict_store=$9, restrict_store_id=$10,
        store_value_limit_cents=$11, store_usage_limit=$12, restrict_customer=$13, customer_id=$14,
        customer_value_limit_cents=$15, customer_usage_limit=$16, restrict_service=$17, service=$18,
        service_value_limit_cents=$19, service_usage_limit=$20
       WHERE id=$1`,
      [id, input.storeId, input.category, input.amountCents, input.amountCents - used, ...this.restrictions(input)],
    );
    return this.get(id);
  }

  async remove(id: string) {
    const v = await this.get(id);
    if (v.uses > 0) throw new HttpError(409, "Voucher já utilizado não pode ser excluído", "voucher_used");
    await this.db.query("DELETE FROM vouchers WHERE id = $1", [id]);
  }

  async redeem(input: RedeemInput) {
    return this.db.tx(async (q) => {
      const v = (await q.query("SELECT * FROM vouchers WHERE code = $1 FOR UPDATE", [normalizeCode(input.code)])).rows[0];
      if (!v) throw new HttpError(404, "Voucher não encontrado", "not_found");
      if (v.valid_from && input.today < v.valid_from) throw new HttpError(400, "Voucher ainda não está válido", "voucher_not_started");
      if (v.valid_to && input.today > v.valid_to) throw new HttpError(400, "Voucher expirado", "voucher_expired");
      if (Number(v.balance_cents) <= 0) throw new HttpError(400, "Voucher sem saldo", "voucher_empty");
      if (v.restrict_store && v.restrict_store_id !== input.storeId) throw new HttpError(400, "Voucher não vale nesta lavanderia", "voucher_store");
      if (v.restrict_customer && v.customer_id && v.customer_id !== input.customerId) throw new HttpError(400, "Voucher não vale para este cliente", "voucher_customer");
      if (v.restrict_service && v.service !== input.service) throw new HttpError(400, "Voucher não vale para este serviço", "voucher_service");

      const limits = await this.remainingLimits(q, v, input);
      const discount = minOf(Number(v.balance_cents), input.purchaseCents, ...limits);
      if (discount <= 0) throw new HttpError(400, "Limite do voucher atingido", "voucher_limit");

      const balance = Number(v.balance_cents) - discount;
      await q.query("UPDATE vouchers SET balance_cents = $2 WHERE id = $1", [v.id, balance]);
      await q.query(
        "INSERT INTO voucher_redemptions (id, voucher_id, store_id, customer_id, service, purchase_cents, discount_cents) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [randomUUID(), v.id, input.storeId, input.customerId ?? null, input.service ?? null, input.purchaseCents, discount],
      );
      return {
        code: v.code,
        discountCents: discount,
        payCents: input.purchaseCents - discount,
        balanceCents: balance,
      };
    });
  }

  private async remainingLimits(q: Queryable, v: any, input: RedeemInput) {
    const usage = async (column: string, value: unknown) => {
      const r = (await q.query(
        `SELECT COUNT(*) AS n, COALESCE(SUM(discount_cents), 0) AS total FROM voucher_redemptions WHERE voucher_id = $1 AND ${column} = $2`,
        [v.id, value],
      )).rows[0];
      return { n: Number(r.n), total: Number(r.total) };
    };
    const out: Array<number | null> = [];
    const check = async (on: boolean, column: string, value: unknown, valueLimit: unknown, usageLimit: unknown) => {
      if (!on) return;
      const u = await usage(column, value);
      if (usageLimit !== null && u.n >= Number(usageLimit)) throw new HttpError(400, "Limite de uso do voucher atingido", "voucher_limit");
      if (valueLimit !== null) out.push(Number(valueLimit) - u.total);
    };
    await check(v.restrict_store, "store_id", input.storeId, v.store_value_limit_cents, v.store_usage_limit);
    await check(v.restrict_customer, "customer_id", input.customerId ?? null, v.customer_value_limit_cents, v.customer_usage_limit);
    await check(v.restrict_service, "service", input.service ?? null, v.service_value_limit_cents, v.service_usage_limit);
    return out;
  }
}

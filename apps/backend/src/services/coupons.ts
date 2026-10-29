import { randomUUID } from "node:crypto";
import type { Db } from "../db.js";
import { HttpError } from "../errors.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const COUPON_CODE = /^[A-Z0-9]{3,20}$/;

export interface Coupon {
  id: string;
  code: string;
  generated: boolean;
  storeId: string;
  storeName: string;
  storeRole: string;
  allFranchiseStores: boolean;
  percent: boolean;
  amount: number;
  valueLimitCents: number | null;
  usageLimit: number | null;
  validFrom: string;
  validTo: string;
  restrictHours: boolean;
  hourStart: string;
  hourEnd: string;
  restrictWeekday: boolean;
  weekday: number | null;
  weekdayValueLimitCents: number | null;
  weekdayUsageLimit: number | null;
  restrictStore: boolean;
  restrictStoreId: string;
  restrictStoreName: string;
  storeValueLimitCents: number | null;
  storeUsageLimit: number | null;
  restrictCustomer: boolean;
  customerId: string;
  customerName: string;
  customerValueLimitCents: number | null;
  customerUsageLimit: number | null;
  restrictService: boolean;
  service: "WASHER" | "DRYER" | "";
  serviceValueLimitCents: number | null;
  serviceUsageLimit: number | null;
  birthday: boolean;
  firstPurchase: boolean;
  createdAt: string;
}

export interface CouponInput {
  code?: string;
  generated?: boolean;
  storeId: string;
  allFranchiseStores?: boolean;
  percent?: boolean;
  amount: number;
  valueLimitCents?: number | null;
  usageLimit?: number | null;
  validFrom?: string;
  validTo?: string;
  restrictHours?: boolean;
  hourStart?: string;
  hourEnd?: string;
  restrictWeekday?: boolean;
  weekday?: number | null;
  weekdayValueLimitCents?: number | null;
  weekdayUsageLimit?: number | null;
  restrictStore?: boolean;
  restrictStoreId?: string;
  storeValueLimitCents?: number | null;
  storeUsageLimit?: number | null;
  restrictCustomer?: boolean;
  customerId?: string;
  customerValueLimitCents?: number | null;
  customerUsageLimit?: number | null;
  restrictService?: boolean;
  service?: "WASHER" | "DRYER" | "";
  serviceValueLimitCents?: number | null;
  serviceUsageLimit?: number | null;
  birthday?: boolean;
  firstPurchase?: boolean;
}

const SELECT = `
  SELECT c.*,
    s.name AS store_name, s.role AS store_role,
    rs.name AS restrict_store_name,
    cu.name AS customer_name
  FROM coupons c
  JOIN stores s ON s.id = c.store_id
  LEFT JOIN stores rs ON rs.id = c.restrict_store_id
  LEFT JOIN customers cu ON cu.id = c.customer_id
`;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  return Number(v);
}

function iso(v: unknown) {
  if (!v) return "";
  return v instanceof Date ? v.toISOString() : String(v);
}

export function mapCoupon(r: any): Coupon {
  return {
    id: r.id,
    code: r.code,
    generated: Boolean(r.generated),
    storeId: r.store_id,
    storeName: r.store_name ?? "",
    storeRole: r.store_role ?? "",
    allFranchiseStores: Boolean(r.all_franchise_stores),
    percent: Boolean(r.percent),
    amount: Number(r.amount),
    valueLimitCents: num(r.value_limit_cents),
    usageLimit: num(r.usage_limit),
    validFrom: r.valid_from ?? "",
    validTo: r.valid_to ?? "",
    restrictHours: Boolean(r.restrict_hours),
    hourStart: r.hour_start ?? "",
    hourEnd: r.hour_end ?? "",
    restrictWeekday: Boolean(r.restrict_weekday),
    weekday: num(r.weekday),
    weekdayValueLimitCents: num(r.weekday_value_limit_cents),
    weekdayUsageLimit: num(r.weekday_usage_limit),
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
    birthday: Boolean(r.birthday),
    firstPurchase: Boolean(r.first_purchase),
    createdAt: iso(r.created_at),
  };
}

export function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function randomCode() {
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

export class CouponService {
  constructor(private db: Db) {}

  async uniqueCode(preferred?: string) {
    if (preferred) {
      const code = normalizeCode(preferred);
      if (!COUPON_CODE.test(code)) throw new HttpError(400, "Código inválido", "invalid_code");
      const taken = (await this.db.query("SELECT 1 FROM coupons WHERE code = $1", [code])).rows[0];
      if (taken) throw new HttpError(409, "Já existe um cupom com este código", "conflict");
      return code;
    }
    for (let i = 0; i < 30; i++) {
      const code = randomCode();
      const taken = (await this.db.query("SELECT 1 FROM coupons WHERE code = $1", [code])).rows[0];
      if (!taken) return code;
    }
    throw new HttpError(500, "Não foi possível gerar um código único", "code_exhausted");
  }

  async get(id: string) {
    const { rows } = await this.db.query(`${SELECT} WHERE c.id = $1`, [id]);
    if (!rows[0]) throw new HttpError(404, "Cupom não encontrado", "not_found");
    return mapCoupon(rows[0]);
  }

  async list(input: { storeId?: string; code?: string; page: number; limit: number }) {
    const storeId = input.storeId?.trim() || "";
    const code = normalizeCode(input.code ?? "");
    const where: string[] = [];
    const params: unknown[] = [];
    if (storeId) {
      params.push(storeId);
      where.push(`(
        c.store_id = $${params.length}
        OR (c.restrict_store AND c.restrict_store_id = $${params.length})
        OR (c.all_franchise_stores AND EXISTS (
          SELECT 1 FROM stores sel WHERE sel.id = $${params.length} AND sel.role = 'FRANQUIA'
        ))
      )`);
    }
    if (code) {
      params.push(`%${code}%`);
      where.push(`c.code LIKE $${params.length}`);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = Number((await this.db.query(`SELECT COUNT(*) AS n FROM coupons c ${clause}`, params)).rows[0]?.n ?? 0);
    params.push(input.limit, input.page * input.limit);
    const { rows } = await this.db.query(
      `${SELECT} ${clause} ORDER BY c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items: rows.map(mapCoupon), total };
  }

  private async assertRefs(input: CouponInput) {
    const store = (await this.db.query("SELECT id, role FROM stores WHERE id = $1", [input.storeId])).rows[0];
    if (!store) throw new HttpError(400, "Lavanderia não encontrada", "invalid_store");
    if (input.allFranchiseStores && store.role !== "FRANQUIA") {
      throw new HttpError(400, "Só a franquia pode liberar o cupom para todas as lojas dela", "invalid_scope");
    }
    if (input.percent && (input.amount < 1 || input.amount > 100)) {
      throw new HttpError(400, "Percentual deve ser entre 1 e 100", "invalid_amount");
    }
    if (!input.percent && input.amount < 1) {
      throw new HttpError(400, "Informe o valor do desconto", "invalid_amount");
    }
    if (input.validFrom && input.validTo && input.validFrom > input.validTo) {
      throw new HttpError(400, "A validade inicial não pode ser depois da final", "invalid_period");
    }
    if (input.restrictHours && (!input.hourStart || !input.hourEnd)) {
      throw new HttpError(400, "Informe o horário inicial e final", "invalid_hours");
    }
    if (input.restrictWeekday && (input.weekday === null || input.weekday === undefined)) {
      throw new HttpError(400, "Informe o dia da semana", "invalid_weekday");
    }
    if (input.restrictStore) {
      if (!input.restrictStoreId) throw new HttpError(400, "Informe a lavanderia da restrição", "invalid_restrict_store");
      const rs = (await this.db.query("SELECT id FROM stores WHERE id = $1", [input.restrictStoreId])).rows[0];
      if (!rs) throw new HttpError(400, "Lavanderia da restrição não encontrada", "invalid_restrict_store");
    }
    if (input.restrictCustomer && input.customerId) {
      const cu = (await this.db.query("SELECT id FROM customers WHERE id = $1", [input.customerId])).rows[0];
      if (!cu) throw new HttpError(400, "Cliente não encontrado", "invalid_customer");
    }
    if (input.restrictService && !input.service) {
      throw new HttpError(400, "Informe o serviço", "invalid_service");
    }
  }

  private values(id: string, code: string, input: CouponInput) {
    return [
      id, code, Boolean(input.generated ?? true), input.storeId, Boolean(input.allFranchiseStores),
      Boolean(input.percent), input.amount, input.valueLimitCents ?? null, input.usageLimit ?? null,
      input.validFrom || null, input.validTo || null, Boolean(input.restrictHours),
      input.restrictHours ? input.hourStart || null : null, input.restrictHours ? input.hourEnd || null : null,
      Boolean(input.restrictWeekday), input.restrictWeekday ? input.weekday ?? null : null,
      input.restrictWeekday ? input.weekdayValueLimitCents ?? null : null,
      input.restrictWeekday ? input.weekdayUsageLimit ?? null : null,
      Boolean(input.restrictStore), input.restrictStore ? input.restrictStoreId || null : null,
      input.restrictStore ? input.storeValueLimitCents ?? null : null,
      input.restrictStore ? input.storeUsageLimit ?? null : null,
      Boolean(input.restrictCustomer), input.restrictCustomer ? input.customerId || null : null,
      input.restrictCustomer ? input.customerValueLimitCents ?? null : null,
      input.restrictCustomer ? input.customerUsageLimit ?? null : null,
      Boolean(input.restrictService), input.restrictService ? input.service || null : null,
      input.restrictService ? input.serviceValueLimitCents ?? null : null,
      input.restrictService ? input.serviceUsageLimit ?? null : null,
      Boolean(input.birthday), Boolean(input.firstPurchase),
    ];
  }

  async create(input: CouponInput) {
    await this.assertRefs(input);
    const id = randomUUID();
    if (input.generated === false && !input.code) throw new HttpError(400, "Informe o código", "invalid_code");
    const code = await this.uniqueCode(input.code || undefined);
    await this.db.query(
      `INSERT INTO coupons (
        id, code, generated, store_id, all_franchise_stores, percent, amount, value_limit_cents, usage_limit,
        valid_from, valid_to, restrict_hours, hour_start, hour_end, restrict_weekday, weekday,
        weekday_value_limit_cents, weekday_usage_limit, restrict_store, restrict_store_id,
        store_value_limit_cents, store_usage_limit, restrict_customer, customer_id,
        customer_value_limit_cents, customer_usage_limit, restrict_service, service,
        service_value_limit_cents, service_usage_limit, birthday, first_purchase
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
      )`,
      this.values(id, code, input),
    );
    return this.get(id);
  }

  async update(id: string, input: CouponInput) {
    await this.get(id);
    await this.assertRefs(input);
    const code = await this.uniqueCodeForUpdate(id, input.generated === false ? input.code : input.code || undefined);
    const vals = this.values(id, code, input);
    await this.db.query(
      `UPDATE coupons SET
        code=$2, generated=$3, store_id=$4, all_franchise_stores=$5, percent=$6, amount=$7,
        value_limit_cents=$8, usage_limit=$9, valid_from=$10, valid_to=$11, restrict_hours=$12,
        hour_start=$13, hour_end=$14, restrict_weekday=$15, weekday=$16, weekday_value_limit_cents=$17,
        weekday_usage_limit=$18, restrict_store=$19, restrict_store_id=$20, store_value_limit_cents=$21,
        store_usage_limit=$22, restrict_customer=$23, customer_id=$24, customer_value_limit_cents=$25,
        customer_usage_limit=$26, restrict_service=$27, service=$28, service_value_limit_cents=$29,
        service_usage_limit=$30, birthday=$31, first_purchase=$32
       WHERE id=$1`,
      vals,
    );
    return this.get(id);
  }

  private async uniqueCodeForUpdate(id: string, preferred?: string) {
    const current = (await this.db.query("SELECT code FROM coupons WHERE id = $1", [id])).rows[0];
    if (!preferred) return current.code;
    const code = normalizeCode(preferred);
    if (code === current.code) return code;
    return this.uniqueCode(code);
  }

  async remove(id: string) {
    await this.get(id);
    await this.db.query("DELETE FROM coupons WHERE id = $1", [id]);
  }
}

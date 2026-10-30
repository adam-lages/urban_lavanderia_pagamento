import type { Db } from "../db.js";

export type PayMethod = "CREDIT" | "DEBIT" | "PIX" | "VOUCHER";

export interface Sale {
  id: string;
  orderId: string;
  storeId: string;
  storeName: string;
  customerName: string;
  customerCpf: string;
  machineLabel: string;
  machineKind: "WASHER" | "DRYER";
  servicesCount: number;
  paidAt: string;
  amountCents: number;
  paidCents: number;
  paymentMethod: PayMethod | null;
  couponCode: string;
  voucherCode: string;
  authCode: string;
  cardBrand: string;
  cardNumber: string;
}

function iso(value: Date | string | null) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : String(value);
}

export function mapSale(r: any): Sale {
  return {
    id: r.id,
    orderId: r.order_id,
    storeId: r.store_id,
    storeName: r.store_name,
    customerName: r.customer_name ?? "",
    customerCpf: r.customer_cpf ?? "",
    machineLabel: r.machine_label,
    machineKind: r.machine_kind,
    servicesCount: Number(r.services_count ?? 1),
    paidAt: iso(r.paid_at),
    amountCents: Number(r.price_cents),
    paidCents: Number(r.total_cents ?? r.price_cents),
    paymentMethod: (r.method as PayMethod | null) ?? null,
    couponCode: r.coupon_code ?? "",
    voucherCode: r.voucher_code ?? "",
    authCode: r.auth_code ?? "",
    cardBrand: r.card_brand ?? "",
    cardNumber: r.card_number ?? "",
  };
}

const FROM = `FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN stores s ON s.id = o.store_id
  JOIN machines m ON m.id = oi.machine_id
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'APPROVED'
  LEFT JOIN (SELECT order_id, COUNT(*) AS n FROM order_items GROUP BY order_id) qty ON qty.order_id = o.id`;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SP_OFFSET = "-03:00";
const digits = (v: string) => v.replace(/\D/g, "");

export class SalesService {
  constructor(private db: Db) {}

  async list(input: {
    storeId?: string;
    customerName?: string;
    customerCpf?: string;
    customerId?: string;
    orderId?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
    const storeId = input.storeId?.trim() || "";
    const name = input.customerName?.trim() || "";
    const cpf = digits(input.customerCpf ?? "");
    const customerId = input.customerId?.trim() || "";
    const orderId = input.orderId?.trim() || "";
    const from = input.from?.trim() || "";
    const to = input.to?.trim() || "";
    const where = ["o.status = 'PAID'"];
    const params: unknown[] = [];
    if (orderId) {
      params.push(orderId);
      where.push(`o.id = $${params.length}`);
    }
    if (storeId) {
      params.push(storeId);
      where.push(`o.store_id = $${params.length}`);
    }
    if (DAY.test(from) && DAY.test(to)) {
      params.push(new Date(`${from}T00:00:00.000${SP_OFFSET}`));
      where.push(`o.paid_at >= $${params.length}`);
      params.push(new Date(`${to}T23:59:59.999${SP_OFFSET}`));
      where.push(`o.paid_at <= $${params.length}`);
    }
    if (customerId) {
      params.push(customerId);
      where.push(`o.customer_id = $${params.length}`);
    } else {
      if (name) {
        params.push(`%${name}%`);
        where.push(`c.name ILIKE $${params.length}`);
      }
      if (cpf) {
        params.push(`%${cpf}%`);
        where.push(`c.cpf LIKE $${params.length}`);
      }
    }
    const clause = `WHERE ${where.join(" AND ")}`;
    const total = Number((await this.db.query(`SELECT COUNT(*) AS n ${FROM} ${clause}`, params)).rows[0]?.n ?? 0);
    params.push(input.limit, input.page * input.limit);
    const { rows } = await this.db.query(
      `SELECT oi.id, o.id AS order_id, o.store_id, s.name AS store_name, o.paid_at, oi.price_cents, o.total_cents,
              m.label AS machine_label, m.kind AS machine_kind, c.name AS customer_name, c.cpf AS customer_cpf,
              o.coupon_code, o.voucher_code, p.method, p.auth_code, p.card_brand, p.card_number,
              qty.n AS services_count
       ${FROM} ${clause}
       ORDER BY o.paid_at DESC, oi.id
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items: rows.map(mapSale), total };
  }
}

import type { Db } from "../db.js";
import { HttpError } from "../errors.js";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;
const SP_OFFSET = "-03:00";
const dayFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" });
const hourFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" });

export const saoPauloDay = (d: Date) => dayFormat.format(d);
const saoPauloHour = (d: Date) => Number(hourFormat.format(d));

const toUtc = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
};
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (day: string, n: number) => fromUtc(toUtc(day) + n * 86_400_000);

function weekStart(day: string) {
  const dow = new Date(toUtc(day)).getUTCDay();
  return addDays(day, -((dow + 6) % 7));
}

function daysBetween(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export interface OverviewInput {
  storeId?: string;
  from: string;
  to: string;
}

export class OverviewService {
  constructor(private db: Db, private now: () => Date = () => new Date()) {}

  async get(input: OverviewInput) {
    const { from, to } = input;
    if (!DAY.test(from) || !DAY.test(to) || to < from) throw new HttpError(400, "Período inválido", "invalid_period");
    if (daysBetween(from, to).length > MAX_DAYS) throw new HttpError(400, "Período maior que 366 dias", "invalid_period");
    const storeId = input.storeId?.trim() || "";

    const items = await this.items(storeId, from, to);
    const machines = await this.machines(storeId);
    return {
      period: { from, to },
      ...this.totals(items),
      machines: this.byMachine(machines, items),
      byDay: this.byDay(items, from, to),
      byWeek: this.byWeek(items),
      byHour: this.byHour(items),
      kinds: this.kinds(items),
      recurrence: this.recurrence(items),
      signups: await this.signups(storeId),
    };
  }

  private async items(storeId: string, from: string, to: string) {
    const params: unknown[] = [new Date(`${from}T00:00:00.000${SP_OFFSET}`), new Date(`${to}T23:59:59.999${SP_OFFSET}`)];
    let store = "";
    if (storeId) {
      params.push(storeId);
      store = ` AND o.store_id = $${params.length}`;
    }
    const { rows } = await this.db.query(
      `SELECT oi.machine_id, oi.kind, oi.price_cents, o.id AS order_id, o.paid_at, o.customer_id
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'PAID' AND o.paid_at >= $1 AND o.paid_at <= $2${store}`,
      params,
    );
    return rows.map((r) => ({
      machineId: r.machine_id as string,
      kind: r.kind as "WASHER" | "DRYER",
      cents: Number(r.price_cents),
      orderId: r.order_id as string,
      paidAt: new Date(r.paid_at),
      customerId: (r.customer_id as string | null) ?? null,
    }));
  }

  private async machines(storeId: string) {
    const { rows } = storeId
      ? await this.db.query(`SELECT m.id, m.label, m.kind, s.name AS store_name FROM machines m JOIN stores s ON s.id = m.store_id WHERE m.store_id = $1 ORDER BY m.kind, m.code, m.label`, [storeId])
      : await this.db.query(`SELECT m.id, m.label, m.kind, s.name AS store_name FROM machines m JOIN stores s ON s.id = m.store_id ORDER BY s.name, m.kind, m.code, m.label`);
    return rows as Array<{ id: string; label: string; kind: "WASHER" | "DRYER"; store_name: string }>;
  }

  private totals(items: Item[]) {
    const revenueCents = items.reduce((s, i) => s + i.cents, 0);
    const cycles = items.length;
    return { cycles, revenueCents, avgTicketCents: cycles ? Math.round(revenueCents / cycles) : 0 };
  }

  private byMachine(machines: Array<{ id: string; label: string; kind: string; store_name: string }>, items: Item[]) {
    return machines.map((m) => {
      const mine = items.filter((i) => i.machineId === m.id);
      return {
        machineId: m.id,
        label: m.label,
        storeName: m.store_name,
        kind: m.kind,
        cycles: mine.length,
        revenueCents: mine.reduce((s, i) => s + i.cents, 0),
      };
    });
  }

  private byDay(items: Item[], from: string, to: string) {
    const map = new Map(daysBetween(from, to).map((d) => [d, { date: d, cycles: 0, revenueCents: 0 }]));
    for (const i of items) {
      const row = map.get(saoPauloDay(i.paidAt));
      if (!row) continue;
      row.cycles += 1;
      row.revenueCents += i.cents;
    }
    return [...map.values()];
  }

  private byWeek(items: Item[]) {
    const map = new Map<string, { weekStart: string; cycles: number; revenueCents: number }>();
    for (const i of items) {
      const key = weekStart(saoPauloDay(i.paidAt));
      const row = map.get(key) ?? { weekStart: key, cycles: 0, revenueCents: 0 };
      row.cycles += 1;
      row.revenueCents += i.cents;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }

  private byHour(items: Item[]) {
    const rows = Array.from({ length: 24 }, (_, hour) => ({ hour, cycles: 0, revenueCents: 0 }));
    for (const i of items) {
      const row = rows[saoPauloHour(i.paidAt)]!;
      row.cycles += 1;
      row.revenueCents += i.cents;
    }
    return rows;
  }

  private kinds(items: Item[]) {
    const washers = items.filter((i) => i.kind === "WASHER").length;
    return { washers, dryers: items.length - washers };
  }

  private recurrence(items: Item[]) {
    const ordersByCustomer = new Map<string, Set<string>>();
    const anonymous = new Set<string>();
    for (const i of items) {
      if (!i.customerId) {
        anonymous.add(i.orderId);
        continue;
      }
      const set = ordersByCustomer.get(i.customerId) ?? new Set<string>();
      set.add(i.orderId);
      ordersByCustomer.set(i.customerId, set);
    }
    const counts = [...ordersByCustomer.values()].map((s) => s.size);
    const once = counts.filter((n) => n === 1).length;
    const twice = counts.filter((n) => n === 2).length;
    const threePlus = counts.filter((n) => n >= 3).length;
    return {
      customers: counts.length,
      returning: twice + threePlus,
      anonymousOrders: anonymous.size,
      buckets: [
        { label: "1 compra", customers: once },
        { label: "2 compras", customers: twice },
        { label: "3 ou mais", customers: threePlus },
      ],
    };
  }

  private async signups(storeId: string) {
    const today = saoPauloDay(this.now());
    const monthStart = `${today.slice(0, 8)}01`;
    const params: unknown[] = [new Date(`${monthStart}T00:00:00.000${SP_OFFSET}`)];
    let store = "";
    if (storeId) {
      params.push(storeId);
      store = " AND store_id = $2";
    }
    const { rows } = await this.db.query(`SELECT created_at FROM customers WHERE created_at >= $1${store}`, params);
    const perDay = new Map<string, number>();
    for (const r of rows) {
      const day = saoPauloDay(new Date(r.created_at));
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    let cumulative = 0;
    const byDay = daysBetween(monthStart, today).map((date) => {
      const count = perDay.get(date) ?? 0;
      cumulative += count;
      return { date, count, cumulative };
    });
    return { month: today.slice(0, 7), total: cumulative, byDay };
  }
}

interface Item {
  machineId: string;
  kind: "WASHER" | "DRYER";
  cents: number;
  orderId: string;
  paidAt: Date;
  customerId: string | null;
}

import type { Queryable } from "./db.js";
import { between, mulberry32, pick, weighted, type Rand } from "./demo-random.js";
import { saoPauloDay } from "./services/overview.js";

export const BASE_PRICE_CENTS = 1690;

const COUPONS = [
  { code: "LAVA10", percent: 10 },
  { code: "SECA15", percent: 15 },
  { code: "URBAN20", percent: 20 },
  { code: "PRIMEIRA25", percent: 25 },
] as const;
const BRANDS = ["Visa", "Mastercard", "Elo", "Hipercard"] as const;
const HOURS: ReadonlyArray<readonly [number, number]> = [
  [8, 3], [9, 5], [10, 8], [11, 8], [12, 7], [13, 5], [14, 4], [15, 4], [16, 5], [17, 7], [18, 8], [19, 8], [20, 5], [21, 3],
];

interface Row { id: string; store_id: string; kind: "WASHER" | "DRYER"; device_id: string | null; channel: number }

const discounted = (cents: number, percent: number) => Math.round(cents * (100 - percent) / 100);
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const dayCount = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

function randomMoment(rand: Rand, fromDay: string, toDay: string, now: Date) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const day = addDays(fromDay, between(rand, 0, Math.max(0, dayCount(fromDay, toDay))));
    const hh = String(weighted(rand, HOURS)).padStart(2, "0");
    const mm = String(between(rand, 0, 59)).padStart(2, "0");
    const at = new Date(`${day}T${hh}:${mm}:${String(between(rand, 0, 59)).padStart(2, "0")}-03:00`);
    if (at <= now) return at;
  }
  return null;
}

function purchaseCount(rand: Rand) {
  return weighted(rand, [[0, 8], [1, 30], [2, 25], [3, 16], [4, 10], [5, 6], [6, 3], [8, 2]] as const);
}

function randomAuth(rand: Rand) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(rand() * chars.length)]).join("");
}

export async function seedSalesIfEmpty(db: Queryable, now: Date = new Date()): Promise<void> {
  if ((await db.query("SELECT 1 FROM orders LIMIT 1")).rows.length) return;
  const rand = mulberry32(20260501);
  const stores = (await db.query("SELECT id FROM stores ORDER BY name")).rows.map((r) => r.id as string);
  const customers = (await db.query("SELECT id, created_at, store_id FROM customers ORDER BY id")).rows;
  const machines = (await db.query("SELECT id, store_id, kind, device_id, channel FROM machines ORDER BY code")).rows as Row[];
  const prices = (await db.query("SELECT store_id, kind, amount_cents FROM prices")).rows;
  if (!stores.length || !customers.length) return;

  const today = saoPauloDay(now);
  const yearStart = `${today.slice(0, 4)}-05-01`;
  let n = 0;

  const sell = async (customerId: string, storeId: string, at: Date) => {
    const pool = machines.filter((m) => m.store_id === storeId);
    const quantity = Math.min(pool.length, weighted(rand, [[1, 45], [2, 30], [3, 15], [4, 10]] as const));
    if (!quantity) return;
    const chosen: Row[] = [];
    while (chosen.length < quantity) {
      const m = pick(rand, pool.filter((p) => !chosen.includes(p)))!;
      chosen.push(m);
    }
    const items = chosen.map((m) => ({ kind: m.kind, machine: m }));
    const coupon = rand() < 0.4 ? pick(rand, COUPONS) : null;
    const method = weighted(rand, [["PIX", 40], ["CREDIT", 30], ["DEBIT", 22], ["VOUCHER", 8]] as const);
    const card = method === "CREDIT" || method === "DEBIT";
    const priced = items.map((i) => {
      const base = prices.find((p) => p.store_id === storeId && p.kind === i.kind)?.amount_cents ?? BASE_PRICE_CENTS;
      return { ...i, cents: coupon ? discounted(Number(base), coupon.percent) : Number(base) };
    });
    n += 1;
    const orderId = `seed-o-${n}`;
    const total = priced.reduce((s, i) => s + i.cents, 0);
    await db.query(
      "INSERT INTO orders (id, store_id, status, total_cents, customer_id, coupon_code, voucher_code, created_at, paid_at) VALUES ($1,$2,'PAID',$3,$4,$5,$6,$7,$7)",
      [orderId, storeId, total, customerId, coupon?.code ?? null, method === "VOUCHER" ? `URB-${between(rand, 100, 999)}` : null, at],
    );
    for (const [k, it] of priced.entries()) {
      const itemId = `seed-i-${n}-${k}`;
      await db.query("INSERT INTO order_items (id, order_id, machine_id, kind, price_cents) VALUES ($1,$2,$3,$4,$5)", [itemId, orderId, it.machine!.id, it.kind, it.cents]);
      await db.query(
        "INSERT INTO release_commands (id, order_item_id, order_id, store_id, machine_id, device_id, channel, status, attempts, issued_at, expires_at, sent_at, done_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'DONE',1,$8,$8,$8,$8,$8)",
        [`seed-c-${n}-${k}`, itemId, orderId, storeId, it.machine!.id, it.machine!.device_id, it.machine!.channel, at],
      );
    }
    await db.query(
      "INSERT INTO payments (id, order_id, provider, external_id, status, method, amount_cents, auth_code, card_brand, card_number, created_at) VALUES ($1,$2,'stone',$3,'APPROVED',$4,$5,$6,$7,$8,$9)",
      [`seed-p-${n}`, orderId, `seed-ext-${n}`, method, total, card ? randomAuth(rand) : null, card ? pick(rand, BRANDS) : null, card ? `**** ${between(rand, 1000, 9999)}` : null, at],
    );
  };

  for (const [index, c] of customers.entries()) {
    const storeId = (c.store_id as string | null) ?? stores[index % stores.length]!;
    const created = saoPauloDay(new Date(c.created_at));
    const firstDay = created > yearStart ? created : yearStart;
    if (firstDay > today) continue;
    for (let i = purchaseCount(rand); i > 0; i--) {
      const at = randomMoment(rand, firstDay, today, now);
      if (at) await sell(c.id, storeId, at);
    }
  }
  for (const [s, storeId] of stores.entries()) {
    const mine = customers.filter((c) => c.store_id === storeId);
    if (!mine.length) continue;
    for (let i = 0; i < 6; i++) {
      const at = randomMoment(rand, today, today, now);
      if (at) await sell(pick(rand, mine).id, storeId, at);
    }
  }
}

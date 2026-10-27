import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedIfEmpty } from "../src/demo-seed.js";
import { startStack, type Stack } from "./helpers.js";

const NOW = new Date("2026-10-27T20:00:00.000Z");

let s: Stack;
beforeEach(async () => {
  s = await startStack();
  await seedIfEmpty(s.db, undefined, NOW);
});
afterEach(async () => {
  await s.close();
});

const rows = async (sql: string, params: unknown[] = []) => (await s.db.query(sql, params)).rows;

describe("dados de demonstração", () => {
  it("cria as máquinas de cada lavanderia com placa própria e código único", async () => {
    const counts = await rows(
      "SELECT s.name, m.kind, COUNT(*) AS n FROM machines m JOIN stores s ON s.id = m.store_id GROUP BY s.name, m.kind ORDER BY s.name, m.kind",
    );
    const table = Object.fromEntries(counts.map((r) => [`${r.name}/${r.kind}`, Number(r.n)]));
    expect(table).toEqual({
      "Algarve/DRYER": 2, "Algarve/WASHER": 2,
      "Maranguape 1/DRYER": 3, "Maranguape 1/WASHER": 3,
      "Parque Recife/DRYER": 2, "Parque Recife/WASHER": 2,
    });
    const unique = await rows("SELECT COUNT(DISTINCT code) AS c, COUNT(DISTINCT device_id) AS d, COUNT(*) AS n FROM machines");
    expect(unique[0]).toMatchObject({ c: 14, d: 14, n: 14 });
  });

  it("cria 50 clientes aleatórios por lavanderia com CPF único", async () => {
    const total = Number((await rows("SELECT COUNT(*) AS n FROM customers"))[0].n);
    expect(total).toBe(8 + 150);
    expect(Number((await rows("SELECT COUNT(DISTINCT cpf) AS n FROM customers"))[0].n)).toBe(total);
    expect(Number((await rows("SELECT COUNT(*) AS n FROM customers WHERE id LIKE 'cli-demo-%'"))[0].n)).toBe(150);
    const perStore = await rows("SELECT store_id, COUNT(*) AS n FROM customers WHERE id LIKE 'cli-demo-%' GROUP BY store_id");
    expect(perStore.map((r) => Number(r.n))).toEqual([50, 50, 50]);

  });

  it("gera vendas de 1º de maio até agora, com cupom e preço base de R$ 16,90", async () => {
    const range = (await rows("SELECT MIN(paid_at) AS first, MAX(paid_at) AS last FROM orders"))[0];
    expect(new Date(range.first).getTime()).toBeGreaterThanOrEqual(new Date("2026-05-01T03:00:00.000Z").getTime());
    expect(new Date(range.last).getTime()).toBeLessThanOrEqual(NOW.getTime());
    expect(new Date(range.last).toISOString().slice(0, 10)).toBe("2026-10-27");

    const prices = await rows("SELECT DISTINCT amount_cents FROM prices");
    expect(prices.map((p) => p.amount_cents)).toEqual([1690]);

    const items = await rows(
      "SELECT oi.price_cents, o.coupon_code FROM order_items oi JOIN orders o ON o.id = oi.order_id",
    );
    expect(items.filter((i) => !i.coupon_code).every((i) => i.price_cents === 1690)).toBe(true);
    const withCoupon = items.filter((i) => i.coupon_code);
    expect(withCoupon.length).toBeGreaterThan(0);
    expect(withCoupon.every((i) => i.price_cents < 1690 && i.price_cents >= 1690 * 0.7)).toBe(true);
  });

  it("ninguém compra na unidade de outro cliente e cada compra bate com o total", async () => {
    const pairs = await rows("SELECT DISTINCT customer_id, store_id FROM orders");
    const storesByCustomer = new Map<string, number>();
    for (const p of pairs) storesByCustomer.set(p.customer_id, (storesByCustomer.get(p.customer_id) ?? 0) + 1);
    expect([...storesByCustomer.values()].every((n) => n === 1)).toBe(true);

    const totals = await rows("SELECT o.id, o.total_cents, oi.price_cents FROM orders o JOIN order_items oi ON oi.order_id = o.id");
    const sums = new Map<string, { total: number; sum: number }>();
    for (const t of totals) {
      const cur = sums.get(t.id) ?? { total: t.total_cents, sum: 0 };
      cur.sum += t.price_cents;
      sums.set(t.id, cur);
    }
    expect([...sums.values()].every((v) => v.total === v.sum)).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADMIN, POS, seed, startStack, type Stack } from "./helpers.js";

let s: Stack;
let storeId: string;
let washerId: string;
let dryerId: string;

async function paidOrder(id: string, customerId: string, paidAt: string, items: Array<[string, "WASHER" | "DRYER", number]>) {
  const total = items.reduce((sum, i) => sum + i[2], 0);
  await s.db.query(
    "INSERT INTO orders (id, store_id, status, total_cents, customer_id, created_at, paid_at) VALUES ($1,$2,'PAID',$3,$4,$5,$5)",
    [id, storeId, total, customerId, paidAt],
  );
  for (const [machineId, kind, cents] of items) {
    await s.db.query("INSERT INTO order_items (id, order_id, machine_id, kind, price_cents) VALUES ($1,$2,$3,$4,$5)", [
      `${id}-${machineId}`,
      id,
      machineId,
      kind,
      cents,
    ]);
  }
}

beforeEach(async () => {
  s = await startStack();
  const { store, washer, dryer } = await seed(s);
  storeId = store.id;
  washerId = washer.id;
  dryerId = dryer.id;
  for (const id of ["c1", "c2"]) {
    await s.db.query(
      "INSERT INTO customers (id, name, birth_date, cpf, email, phone, created_at) VALUES ($1,$1,'1990-01-01',$2,'a@a.com','1',now())",
      [id, id === "c1" ? "11111111111" : "22222222222"],
    );
  }
  await paidOrder("o1", "c1", "2026-10-05T13:00:00.000Z", [[washerId, "WASHER", 1800]]);
  await paidOrder("o2", "c1", "2026-10-05T17:30:00.000Z", [[washerId, "WASHER", 1800], [dryerId, "DRYER", 1200]]);
  await paidOrder("o3", "c2", "2026-10-06T02:00:00.000Z", [[dryerId, "DRYER", 1200]]);
});
afterEach(async () => {
  await s.close();
});

const get = async (query: string) => s.app.inject({ method: "GET", url: `/dashboard/overview?${query}`, headers: ADMIN });

describe("visão geral do dashboard", () => {
  it("soma ciclos, faturamento e ticket médio no fuso de São Paulo", async () => {
    const res = await get(`storeId=${storeId}&from=2026-10-05&to=2026-10-05`);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.cycles).toBe(4);
    expect(body.revenueCents).toBe(6000);
    expect(body.avgTicketCents).toBe(1500);
    expect(body.kinds).toEqual({ washers: 2, dryers: 2 });
    expect(body.byHour[10].revenueCents).toBe(1800);
    expect(body.byHour[14].revenueCents).toBe(3000);
    expect(body.byHour[23].revenueCents).toBe(1200);
    expect(body.byDay).toEqual([{ date: "2026-10-05", cycles: 4, revenueCents: 6000 }]);
    expect(body.byWeek).toEqual([{ weekStart: "2026-10-05", cycles: 4, revenueCents: 6000 }]);
  });

  it("separa o faturamento por máquina e respeita o período", async () => {
    const wide = (await get(`storeId=${storeId}&from=2026-10-05&to=2026-10-07`)).json();
    expect(wide.byDay).toHaveLength(3);
    const washer = wide.machines.find((m: { machineId: string }) => m.machineId === washerId);
    const dryer = wide.machines.find((m: { machineId: string }) => m.machineId === dryerId);
    expect(washer).toMatchObject({ kind: "WASHER", cycles: 2, revenueCents: 3600 });
    expect(dryer).toMatchObject({ kind: "DRYER", cycles: 2, revenueCents: 2400 });
    const empty = (await get(`storeId=${storeId}&from=2026-10-10&to=2026-10-10`)).json();
    expect(empty).toMatchObject({ cycles: 0, revenueCents: 0, avgTicketCents: 0 });
  });

  it("mede a recorrência de compras e o cadastro de clientes no mês", async () => {
    const body = (await get(`storeId=${storeId}&from=2026-10-05&to=2026-10-07`)).json();
    expect(body.recurrence).toMatchObject({ customers: 2, returning: 1, anonymousOrders: 0 });
    expect(body.recurrence.buckets.map((b: { customers: number }) => b.customers)).toEqual([1, 1, 0]);
    expect(body.signups.total).toBe(2);
    expect(body.signups.byDay.at(-1).cumulative).toBe(2);
    const other = (await get("storeId=nao-existe&from=2026-10-05&to=2026-10-07")).json();
    expect(other.signups.total).toBe(0);
  });

  it("valida o período e exige admin", async () => {
    expect((await get("from=2026-10-07&to=2026-10-05")).statusCode).toBe(400);
    expect((await get("from=abc&to=2026-10-05")).statusCode).toBe(400);
    const denied = await s.app.inject({ method: "GET", url: "/dashboard/overview?from=2026-10-05&to=2026-10-05", headers: POS });
    expect(denied.statusCode).toBe(401);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedIfEmpty } from "../src/demo-seed.js";
import { ADMIN, POS, startStack, type Stack } from "./helpers.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
  await seedIfEmpty(s.db, undefined, new Date("2026-10-27T20:00:00.000Z"));
});
afterEach(async () => {
  await s.close();
});

const sales = async (query: string) => (await s.app.inject({ method: "GET", url: `/sales?${query}`, headers: ADMIN })).json();

describe("vendas", () => {
  it("lista vendas paginadas e filtra por loja, nome e cliente", async () => {
    const all = await sales("page=0&limit=5");
    expect(all.total).toBeGreaterThan(300);
    expect(all.items).toHaveLength(5);
    expect(all.items[0].machineLabel).toBeTruthy();
    expect(all.items[0].servicesCount).toBeGreaterThanOrEqual(1);

    const store = await sales("storeId=loja-algarve&limit=100");
    expect(store.total).toBeGreaterThan(0);
    expect(store.total).toBeLessThan(all.total);
    expect(store.items.every((r: { storeId: string }) => r.storeId === "loja-algarve")).toBe(true);

    const byName = await sales("customerName=ana souza&limit=100");
    expect(byName.items.every((r: { customerName: string }) => r.customerName === "Ana Souza")).toBe(true);

    const byCpf = await sales("customerCpf=529.982.247-25&limit=100");
    expect(byCpf.total).toBe(byName.total);
    expect(byCpf.items.every((r: { customerCpf: string }) => r.customerCpf === "52998224725")).toBe(true);

    const byId = await sales("customerId=cli-ana&limit=100");
    expect(byId.total).toBe(byName.total);

    const day = await sales("from=2026-10-27&to=2026-10-27&limit=5");
    expect(day.total).toBeGreaterThan(0);
    expect(day.total).toBeLessThan(all.total);

    const empty = await sales("from=2000-01-01&to=2000-01-02&limit=5");
    expect(empty.total).toBe(0);
  });

  it("filtra pelo pagamento e traz todos os serviços com o valor pago", async () => {
    const multi = (await sales("limit=100")).items.find((i: { servicesCount: number }) => i.servicesCount > 1);
    const order = await sales(`orderId=${multi.orderId}&limit=100`);
    expect(order.items).toHaveLength(multi.servicesCount);
    const sum = order.items.reduce((t: number, i: { amountCents: number }) => t + i.amountCents, 0);
    expect(order.items.every((i: { paidCents: number }) => i.paidCents === sum)).toBe(true);
  });

  it("recusa quem não é admin", async () => {
    expect((await s.app.inject({ method: "GET", url: "/sales", headers: POS })).statusCode).toBe(401);
  });
});

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

    const store = await sales("storeId=loja-algarve&limit=100");
    expect(store.total).toBeGreaterThan(0);
    expect(store.total).toBeLessThan(all.total);
    expect(store.items.every((r: { storeId: string }) => r.storeId === "loja-algarve")).toBe(true);

    const byName = await sales("customerName=ana souza&limit=100");
    expect(byName.items.every((r: { customerName: string }) => r.customerName === "Ana Souza")).toBe(true);

    const byId = await sales("customerId=cli-ana&limit=100");
    expect(byId.total).toBe(byName.total);
  });

  it("recusa quem não é admin", async () => {
    expect((await s.app.inject({ method: "GET", url: "/sales", headers: POS })).statusCode).toBe(401);
  });
});

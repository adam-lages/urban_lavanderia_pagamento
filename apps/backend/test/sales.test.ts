import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedIfEmpty } from "../src/demo-seed.js";
import { ADMIN, POS, startStack, type Stack } from "./helpers.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
  await seedIfEmpty(s.db);
});
afterEach(async () => {
  await s.close();
});

describe("vendas", () => {
  it("lista vendas paginadas e filtra por loja e nome", async () => {
    const all = await s.app.inject({ method: "GET", url: "/sales?page=0&limit=5", headers: ADMIN });
    expect(all.statusCode).toBe(200);
    expect(all.json().total).toBe(8);
    expect(all.json().items).toHaveLength(5);
    expect(all.json().items[0].machineLabel).toBeTruthy();

    const store = (await s.app.inject({
      method: "GET",
      url: "/sales?storeId=loja-algarve&limit=25",
      headers: ADMIN,
    })).json();
    expect(store.total).toBe(2);
    expect(store.items.every((r: { storeId: string }) => r.storeId === "loja-algarve")).toBe(true);

    const byName = (await s.app.inject({
      method: "GET",
      url: "/sales?customerName=ana&limit=25",
      headers: ADMIN,
    })).json();
    expect(byName.total).toBe(2);
    expect(byName.items.every((r: { customerName: string }) => r.customerName === "Ana Souza")).toBe(true);

    const byId = (await s.app.inject({
      method: "GET",
      url: "/sales?customerId=cli-ana&limit=25",
      headers: ADMIN,
    })).json();
    expect(byId.total).toBe(2);
    expect(byId.items.map((r: { machineLabel: string }) => r.machineLabel).sort()).toEqual(["Lavadora 1", "Secadora 1"]);
  });

  it("recusa quem não é admin", async () => {
    expect((await s.app.inject({ method: "GET", url: "/sales", headers: POS })).statusCode).toBe(401);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADMIN, POS, seed, startStack, type Stack } from "./helpers.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
});
afterEach(async () => {
  await s.close();
});

const create = (payload: Record<string, unknown>) =>
  s.app.inject({ method: "POST", url: "/vouchers", headers: ADMIN, payload });

const redeem = (payload: Record<string, unknown>) =>
  s.app.inject({ method: "POST", url: "/pos/vouchers/redeem", headers: POS, payload });

describe("carteira (vouchers)", () => {
  it("cadastra, lista, edita e exclui", async () => {
    const { store } = await seed(s);
    const created = await create({ storeId: store.id, category: "CREDITO", amountCents: 5000 });
    expect(created.statusCode).toBe(201);
    const v = created.json();
    expect(v.code).toMatch(/^VC[A-Z0-9]{8}$/);
    expect(v.balanceCents).toBe(5000);

    const list = (await s.app.inject({ method: "GET", url: `/vouchers?storeId=${store.id}`, headers: ADMIN })).json();
    expect(list.total).toBe(1);

    const patched = await s.app.inject({
      method: "PATCH", url: `/vouchers/${v.id}`, headers: ADMIN,
      payload: { storeId: store.id, category: "CORTESIA", amountCents: 8000, recurring: true },
    });
    expect(patched.json().balanceCents).toBe(8000);
    expect(patched.json().recurring).toBe(true);

    expect((await s.app.inject({ method: "DELETE", url: `/vouchers/${v.id}`, headers: ADMIN })).statusCode).toBe(204);
  });

  it("abate a compra parcial e depois total, descontando do saldo", async () => {
    const { store } = await seed(s);
    const v = (await create({ storeId: store.id, category: "CREDITO", amountCents: 3000 })).json();

    const first = await redeem({ code: v.code, storeId: store.id, purchaseCents: 1800 });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ discountCents: 1800, payCents: 0, balanceCents: 1200 });

    const second = (await redeem({ code: v.code, storeId: store.id, purchaseCents: 1800 })).json();
    expect(second).toMatchObject({ discountCents: 1200, payCents: 600, balanceCents: 0 });

    expect((await redeem({ code: v.code, storeId: store.id, purchaseCents: 1800 })).statusCode).toBe(400);

    const used = await s.app.inject({ method: "DELETE", url: `/vouchers/${v.id}`, headers: ADMIN });
    expect(used.statusCode).toBe(409);
  });

  it("respeita restrição de serviço e limite de uso", async () => {
    const { store } = await seed(s);
    const v = (await create({
      storeId: store.id, category: "PROMOCIONAL", amountCents: 10000,
      restrictService: true, service: "DRYER", serviceUsageLimit: 1,
    })).json();
    expect((await redeem({ code: v.code, storeId: store.id, purchaseCents: 1200, service: "WASHER" })).statusCode).toBe(400);
    expect((await redeem({ code: v.code, storeId: store.id, purchaseCents: 1200, service: "DRYER" })).statusCode).toBe(200);
    expect((await redeem({ code: v.code, storeId: store.id, purchaseCents: 1200, service: "DRYER" })).statusCode).toBe(400);
  });
});

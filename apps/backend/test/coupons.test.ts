import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADMIN, seed, startStack, type Stack } from "./helpers.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
});
afterEach(async () => {
  await s.close();
});

async function extraStore(role: "FRANQUIA" | "FRANQUEADO", code: string, cnpj: string) {
  return (await s.app.inject({
    method: "POST",
    url: "/stores",
    headers: ADMIN,
    payload: {
      name: role === "FRANQUIA" ? "Parque" : "Algarve",
      legalName: "Razão",
      code,
      cnpj,
      role,
      loginEmail: role === "FRANQUEADO" ? "algarve@urban.test" : undefined,
      loginPassword: role === "FRANQUEADO" ? "Senha1234" : undefined,
    },
  })).json();
}

describe("cupons", () => {
  it("cadastra, lista pela lavanderia, edita e exclui", async () => {
    const { store } = await seed(s);
    const next = await s.app.inject({ method: "GET", url: "/coupons/next-code", headers: ADMIN });
    expect(next.statusCode).toBe(200);
    expect(next.json().code).toMatch(/^[A-Z0-9]{8}$/);

    const created = await s.app.inject({
      method: "POST",
      url: "/coupons",
      headers: ADMIN,
      payload: {
        storeId: store.id,
        generated: true,
        code: next.json().code,
        percent: true,
        amount: 10,
        usageLimit: 100,
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        firstPurchase: true,
      },
    });
    expect(created.statusCode).toBe(201);
    const coupon = created.json();
    expect(coupon.code).toBe(next.json().code);
    expect(coupon.percent).toBe(true);
    expect(coupon.amount).toBe(10);
    expect(coupon.firstPurchase).toBe(true);
    expect(coupon.storeName).toBe("Loja 1");

    const list = await s.app.inject({ method: "GET", url: `/coupons?storeId=${store.id}`, headers: ADMIN });
    expect(list.json().total).toBe(1);
    expect(list.json().items[0].id).toBe(coupon.id);

    const patched = await s.app.inject({
      method: "PATCH",
      url: `/coupons/${coupon.id}`,
      headers: ADMIN,
      payload: { storeId: store.id, generated: true, code: coupon.code, percent: false, amount: 500, birthday: true },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().amount).toBe(500);
    expect(patched.json().percent).toBe(false);
    expect(patched.json().birthday).toBe(true);

    const del = await s.app.inject({ method: "DELETE", url: `/coupons/${coupon.id}`, headers: ADMIN });
    expect(del.statusCode).toBe(204);
    expect((await s.app.inject({ method: "GET", url: `/coupons/${coupon.id}`, headers: ADMIN })).statusCode).toBe(404);
  });

  it("mostra o cupom da franquia nas outras lojas da franquia, não nas de franqueado", async () => {
    const { store } = await seed(s);
    const otherFranquia = await extraStore("FRANQUIA", "10000002", "11222333000181");
    const franqueado = await extraStore("FRANQUEADO", "10000003", "33444555000181");
    const created = await s.app.inject({
      method: "POST",
      url: "/coupons",
      headers: ADMIN,
      payload: { storeId: store.id, allFranchiseStores: true, percent: true, amount: 20, generated: true },
    });
    expect(created.statusCode).toBe(201);

    const atOther = (await s.app.inject({ method: "GET", url: `/coupons?storeId=${otherFranquia.id}`, headers: ADMIN })).json();
    expect(atOther.total).toBe(1);

    const atFranqueado = (await s.app.inject({ method: "GET", url: `/coupons?storeId=${franqueado.id}`, headers: ADMIN })).json();
    expect(atFranqueado.total).toBe(0);

    const scoped = await s.app.inject({
      method: "POST",
      url: "/coupons",
      headers: ADMIN,
      payload: { storeId: franqueado.id, allFranchiseStores: true, percent: true, amount: 15, generated: true },
    });
    expect(scoped.statusCode).toBe(400);
  });

  it("recusa código duplicado e percentual fora da faixa", async () => {
    const { store } = await seed(s);
    const first = await s.app.inject({
      method: "POST",
      url: "/coupons",
      headers: ADMIN,
      payload: { storeId: store.id, code: "LAVA10", generated: false, percent: true, amount: 10 },
    });
    expect(first.statusCode).toBe(201);
    const dup = await s.app.inject({
      method: "POST",
      url: "/coupons",
      headers: ADMIN,
      payload: { storeId: store.id, code: "lava10", generated: false, percent: true, amount: 10 },
    });
    expect(dup.statusCode).toBe(409);
    const bad = await s.app.inject({
      method: "POST",
      url: "/coupons",
      headers: ADMIN,
      payload: { storeId: store.id, generated: true, percent: true, amount: 150 },
    });
    expect(bad.statusCode).toBe(400);
  });
});

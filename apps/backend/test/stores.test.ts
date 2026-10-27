import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADMIN, POS, seed, startStack, type Stack } from "./helpers.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
});
afterEach(async () => {
  await s.close();
});

describe("lavanderias", () => {
  it("cadastra, lista, edita e exclui", async () => {
    const created = await s.app.inject({
      method: "POST",
      url: "/stores",
      headers: ADMIN,
      payload: { name: "Centro", address: "Rua A, 10" },
    });
    expect(created.statusCode).toBe(201);
    const store = created.json();
    expect(store.address).toBe("Rua A, 10");
    expect(store.code).toMatch(/^\d{8}$/);
    expect(store.active).toBe(true);

    const list = (await s.app.inject({ method: "GET", url: "/stores", headers: ADMIN })).json();
    expect(list).toHaveLength(1);

    const patched = await s.app.inject({
      method: "PATCH",
      url: `/stores/${store.id}`,
      headers: ADMIN,
      payload: { name: "Centro Sul", address: "Rua B, 20" },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().name).toBe("Centro Sul");
    expect(patched.json().address).toBe("Rua B, 20");
    expect(patched.json().code).toBe(store.code);

    const keepCode = await s.app.inject({
      method: "PATCH",
      url: `/stores/${store.id}`,
      headers: ADMIN,
      payload: { code: "88888888" },
    });
    expect(keepCode.statusCode).toBe(400);
    const still = (await s.app.inject({ method: "GET", url: `/stores/${store.id}`, headers: ADMIN })).json();
    expect(still.code).toBe(store.code);

    const one = (await s.app.inject({ method: "GET", url: `/stores/${store.id}`, headers: ADMIN })).json();
    expect(one.address).toBe("Rua B, 20");

    const del = await s.app.inject({ method: "DELETE", url: `/stores/${store.id}`, headers: ADMIN });
    expect(del.statusCode).toBe(204);
    expect((await s.app.inject({ method: "GET", url: `/stores/${store.id}`, headers: ADMIN })).statusCode).toBe(404);
  });

  it("recusa código duplicado", async () => {
    await s.app.inject({ method: "POST", url: "/stores", headers: ADMIN, payload: { name: "A", code: "10000001" } });
    const dup = await s.app.inject({ method: "POST", url: "/stores", headers: ADMIN, payload: { name: "B", code: "10000001" } });
    expect(dup.statusCode).toBe(409);
  });

  it("exclui lavanderia sem vendas e remove máquinas", async () => {
    const { store } = await seed(s);
    const del = await s.app.inject({ method: "DELETE", url: `/stores/${store.id}`, headers: ADMIN });
    expect(del.statusCode).toBe(204);
    const machines = (await s.app.inject({ method: "GET", url: "/machines", headers: ADMIN })).json();
    expect(machines).toHaveLength(0);
  });

  it("não exclui lavanderia com vendas", async () => {
    const { store, washer } = await seed(s);
    await s.addDevice("esp-1");
    const order = await s.app.inject({
      method: "POST",
      url: "/orders",
      headers: POS,
      payload: { storeId: store.id, machineIds: [washer.id] },
    });
    expect(order.statusCode).toBe(201);
    const del = await s.app.inject({ method: "DELETE", url: `/stores/${store.id}`, headers: ADMIN });
    expect(del.statusCode).toBe(409);
    expect(del.json().message).toMatch(/vendas/);
  });

  it("lista máquinas da loja com código, status e bloqueio", async () => {
    const { store, washer } = await seed(s);
    const list = (await s.app.inject({ method: "GET", url: `/machines?storeId=${store.id}`, headers: ADMIN })).json();
    expect(list).toHaveLength(2);
    expect(list[0].code).toMatch(/^\d{6}$/);
    expect(list.find((m: { id: string }) => m.id === washer.id).status).toBe("OFFLINE");
    expect(list.find((m: { id: string }) => m.id === washer.id).blocked).toBe(false);
    const locked = await s.app.inject({
      method: "PATCH",
      url: `/machines/${washer.id}`,
      headers: ADMIN,
      payload: { blocked: true },
    });
    expect(locked.statusCode).toBe(200);
    expect(locked.json()).toMatchObject({ blocked: true, active: false });
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADMIN, POS, seed, startStack, waitFor, type Stack } from "./helpers.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
});
afterEach(async () => {
  await s.close();
});

const payBody = (externalId: string, extra: object = {}) => ({ provider: "simulated", payload: { externalId, ...extra } });

describe("cadastro", () => {
  it("exige token e valida canal 100-1000", async () => {
    expect((await s.app.inject({ method: "GET", url: "/stores" })).statusCode).toBe(401);
    const { store } = await seed(s);
    const bad = await s.app.inject({
      method: "POST", url: "/machines", headers: ADMIN,
      payload: { storeId: store.id, kind: "WASHER", label: "X", channel: 50, deviceId: "d" },
    });
    expect(bad.statusCode).toBe(400);
    const dup = await s.app.inject({
      method: "POST", url: "/machines", headers: ADMIN,
      payload: { storeId: store.id, kind: "WASHER", label: "Lavadora 1", channel: 200, deviceId: "d" },
    });
    expect(dup.statusCode).toBe(409);
  });

  it("usa preço da loja e permite override por máquina", async () => {
    const { store, washer } = await seed(s);
    await s.addDevice("esp-1");
    await s.app.inject({ method: "PATCH", url: `/machines/${washer.id}`, headers: ADMIN, payload: { priceOverrideCents: 2500 } });
    const cfg = (await s.app.inject({ method: "GET", url: `/pos/stores/${store.id}/config`, headers: POS })).json();
    expect(cfg.machines.find((m: any) => m.id === washer.id).priceCents).toBe(2500);
    expect(cfg.machines.find((m: any) => m.kind === "DRYER").priceCents).toBe(1200);
  });
});

describe("fluxo ponta a ponta", () => {
  it("pedido -> pagamento -> comando -> pulso na placa -> DONE; relatório", async () => {
    const { store, washer, dryer } = await seed(s);
    const d1 = await s.addDevice("esp-1");
    const d2 = await s.addDevice("esp-2");
    const res = await s.app.inject({ method: "POST", url: "/orders", headers: POS, payload: { storeId: store.id, machineIds: [washer.id, dryer.id] } });
    expect(res.statusCode).toBe(201);
    const order = res.json();
    expect(order.totalCents).toBe(3000);

    const pay = await s.app.inject({ method: "POST", url: `/orders/${order.id}/payments`, headers: POS, payload: payBody("pay-1") });
    expect(pay.statusCode).toBe(201);
    expect(pay.json().status).toBe("PAID");

    await waitFor(async () => (await s.app.inject({ method: "GET", url: "/commands?status=DONE", headers: ADMIN })).json().length === 2);
    expect(d1.pulses.map((p) => p.channel)).toEqual([100]);
    expect(d2.pulses.map((p) => p.channel)).toEqual([500]);

    const report = (await s.app.inject({ method: "GET", url: "/reports/sales", headers: ADMIN })).json();
    expect(report.totals).toEqual({ orders: 1, revenueCents: 3000 });
    expect(report.byKind.WASHER).toEqual({ count: 1, revenueCents: 1800 });
    expect(report.byDay).toHaveLength(1);

    const empty = (await s.app.inject({ method: "GET", url: "/reports/sales?from=2000-01-01&to=2000-01-02", headers: ADMIN })).json();
    expect(empty.totals.orders).toBe(0);

    const cmds = (await s.app.inject({ method: "GET", url: "/commands", headers: ADMIN })).json();
    const detail = (await s.app.inject({ method: "GET", url: `/commands/${cmds[0].id}`, headers: ADMIN })).json();
    expect(detail.events.map((e: any) => e.type)).toEqual(["CREATED", "SENT", "DONE"]);
  });

  it("pagamento recusado não libera nada", async () => {
    const { store, washer } = await seed(s);
    const d1 = await s.addDevice("esp-1");
    const order = (await s.app.inject({ method: "POST", url: "/orders", headers: POS, payload: { storeId: store.id, machineIds: [washer.id] } })).json();
    const pay = await s.app.inject({ method: "POST", url: `/orders/${order.id}/payments`, headers: POS, payload: payBody("pay-x", { outcome: "declined" }) });
    expect(pay.json().status).toBe("PENDING");
    expect(pay.json().commands).toHaveLength(0);
    expect(d1.pulses).toHaveLength(0);
    const retry = await s.app.inject({ method: "POST", url: `/orders/${order.id}/payments`, headers: POS, payload: payBody("pay-y") });
    expect(retry.json().status).toBe("PAID");
  });
});

describe("idempotência", () => {
  it("Idempotency-Key devolve o mesmo pedido", async () => {
    const { store, washer } = await seed(s);
    await s.addDevice("esp-1");
    const h = { ...POS, "idempotency-key": "abc" };
    const payload = { storeId: store.id, machineIds: [washer.id] };
    const a = await s.app.inject({ method: "POST", url: "/orders", headers: h, payload });
    const b = await s.app.inject({ method: "POST", url: "/orders", headers: h, payload });
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(200);
    expect(b.json().id).toBe(a.json().id);
  });

  it("reenvio do mesmo pagamento (também em paralelo) gera exatamente um pulso", async () => {
    const { store, washer } = await seed(s);
    const d1 = await s.addDevice("esp-1");
    const order = (await s.app.inject({ method: "POST", url: "/orders", headers: POS, payload: { storeId: store.id, machineIds: [washer.id] } })).json();
    const call = () => s.app.inject({ method: "POST", url: `/orders/${order.id}/payments`, headers: POS, payload: payBody("same") });
    const results = await Promise.all([call(), call(), call()]);
    expect(results.every((r) => [200, 201].includes(r.statusCode))).toBe(true);
    await waitFor(() => d1.pulses.length >= 1);
    await new Promise((r) => setTimeout(r, 200));
    expect(d1.pulses).toHaveLength(1);
    const cmds = (await s.app.inject({ method: "GET", url: "/commands", headers: ADMIN })).json();
    expect(cmds).toHaveLength(1);
  });

  it("segundo pagamento (outro id) em pedido já pago é rejeitado", async () => {
    const { store, washer } = await seed(s);
    await s.addDevice("esp-1");
    const order = (await s.app.inject({ method: "POST", url: "/orders", headers: POS, payload: { storeId: store.id, machineIds: [washer.id] } })).json();
    await s.app.inject({ method: "POST", url: `/orders/${order.id}/payments`, headers: POS, payload: payBody("p1") });
    const second = await s.app.inject({ method: "POST", url: `/orders/${order.id}/payments`, headers: POS, payload: payBody("p2") });
    expect(second.statusCode).toBe(409);
  });

  it("reenvio manual de comando já concluído é bloqueado", async () => {
    const { store, washer } = await seed(s);
    const d1 = await s.addDevice("esp-1");
    const order = (await s.app.inject({ method: "POST", url: "/orders", headers: POS, payload: { storeId: store.id, machineIds: [washer.id] } })).json();
    await s.app.inject({ method: "POST", url: `/orders/${order.id}/payments`, headers: POS, payload: payBody("p1") });
    await waitFor(async () => (await s.app.inject({ method: "GET", url: "/commands?status=DONE", headers: ADMIN })).json().length === 1);
    const [cmd] = (await s.app.inject({ method: "GET", url: "/commands", headers: ADMIN })).json();
    const r = await s.app.inject({ method: "POST", url: `/commands/${cmd.id}/retry`, headers: ADMIN });
    expect(r.statusCode).toBe(409);
  });
});

describe("falhas", () => {
  it("recusa venda quando a placa está offline", async () => {
    const { store, washer } = await seed(s);
    const res = await s.app.inject({ method: "POST", url: "/orders", headers: POS, payload: { storeId: store.id, machineIds: [washer.id] } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("device_offline");
  });

  it("valor do pagamento diferente do pedido é rejeitado (Stone)", async () => {
    const { store, washer } = await seed(s);
    await s.addDevice("esp-1");
    const order = (await s.app.inject({ method: "POST", url: "/orders", headers: POS, payload: { storeId: store.id, machineIds: [washer.id] } })).json();
    const res = await s.app.inject({
      method: "POST", url: `/orders/${order.id}/payments`, headers: POS,
      payload: { provider: "stone_deeplink", payload: { code: "0", itk: "itk-1", amount: "100" } },
    });
    expect(res.statusCode).toBe(422);
    const ok = await s.app.inject({
      method: "POST", url: `/orders/${order.id}/payments`, headers: POS,
      payload: { provider: "stone_deeplink", payload: { code: "0", itk: "itk-2", amount: "1800", type: "PIX" } },
    });
    expect(ok.json().status).toBe("PAID");
  });

  it("paga com placa que cai: comando fica PENDING e é entregue quando volta", async () => {
    const { store, washer } = await seed(s);
    const d1 = await s.addDevice("esp-1");
    const order = (await s.app.inject({ method: "POST", url: "/orders", headers: POS, payload: { storeId: store.id, machineIds: [washer.id] } })).json();
    await d1.crash();
    await waitFor(() => !s.gateway.isOnline("esp-1"));
    await s.app.inject({ method: "POST", url: `/orders/${order.id}/payments`, headers: POS, payload: payBody("p1") });
    const [pending] = (await s.app.inject({ method: "GET", url: "/commands", headers: ADMIN })).json();
    expect(pending.status).toBe("PENDING");
    const d1b = await s.addDevice("esp-1");
    await waitFor(() => d1b.pulses.length === 1);
    await waitFor(async () => (await s.app.inject({ method: "GET", url: "/commands?status=DONE", headers: ADMIN })).json().length === 1);
  });

  it("sem ack vira UNCONFIRMED (sem reenvio automático) e reenvio manual não duplica pulso", async () => {
    let clock = new Date();
    await s.close();
    s = await startStack();
    const { store, washer } = await seed(s);
    const d1 = await s.addDevice("esp-1", { dropAcks: true });
    const order = (await s.app.inject({ method: "POST", url: "/orders", headers: POS, payload: { storeId: store.id, machineIds: [washer.id] } })).json();
    await s.app.inject({ method: "POST", url: `/orders/${order.id}/payments`, headers: POS, payload: payBody("p1") });
    await waitFor(() => d1.pulses.length === 1);
    await waitFor(async () => (await s.app.inject({ method: "GET", url: "/commands?status=SENT", headers: ADMIN })).json().length === 1);

    // força o prazo de ack vencido
    await s.db.query("UPDATE release_commands SET sent_at = $1", [new Date(clock.getTime() - 120_000)]);
    await s.app.releases.sweep();
    const [cmd] = (await s.app.inject({ method: "GET", url: "/commands", headers: ADMIN })).json();
    expect(cmd.status).toBe("UNCONFIRMED");
    await s.app.releases.sweep();
    expect(d1.pulses).toHaveLength(1);

    const r = await s.app.inject({ method: "POST", url: `/commands/${cmd.id}/retry`, headers: ADMIN });
    expect(r.statusCode).toBe(200);
    await new Promise((res) => setTimeout(res, 200));
    expect(d1.pulses).toHaveLength(1);
  });

  it("placa rejeita comando: status FAILED", async () => {
    const { store, washer } = await seed(s);
    await s.addDevice("esp-1", { failAll: true });
    const order = (await s.app.inject({ method: "POST", url: "/orders", headers: POS, payload: { storeId: store.id, machineIds: [washer.id] } })).json();
    await s.app.inject({ method: "POST", url: `/orders/${order.id}/payments`, headers: POS, payload: payBody("p1") });
    await waitFor(async () => (await s.app.inject({ method: "GET", url: "/commands?status=FAILED", headers: ADMIN })).json().length === 1);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADMIN, POS, seed, startStack, type Stack } from "./helpers.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
});
afterEach(async () => {
  await s.close();
});

describe("máquinas", () => {
  it("lista com status, IP da ESP32 e último bloqueio", async () => {
    const { store, washer } = await seed(s);
    await s.addDevice("esp-1");
    await s.db.query("UPDATE devices SET info = $2 WHERE device_id = $1", ["esp-1", JSON.stringify({ ip: "10.1.2.8", fw: "0.1.0" })]);

    const list = (await s.app.inject({
      method: "GET",
      url: `/machines?storeId=${store.id}`,
      headers: ADMIN,
    })).json();
    const row = list.find((m: { id: string }) => m.id === washer.id);
    expect(row.status).toBe("ONLINE");
    expect(row.ip).toBe("10.1.2.8");
    expect(row.storeName).toBe("Loja 1");

    const locked = await s.app.inject({
      method: "PATCH",
      url: `/machines/${washer.id}`,
      headers: ADMIN,
      payload: { blocked: true },
    });
    expect(locked.json().blocked).toBe(true);
    expect(locked.json().lastBlockedAt).toBeTruthy();

    const one = (await s.app.inject({ method: "GET", url: `/machines/${washer.id}`, headers: ADMIN })).json();
    expect(one.id).toBe(washer.id);
    expect(one.lastBlockedAt).toBeTruthy();
  });

  it("gera código de 6 dígitos que ainda não existe no banco", async () => {
    await seed(s);
    const next = await s.app.inject({ method: "GET", url: "/machines/next-code", headers: ADMIN });
    expect(next.statusCode).toBe(200);
    expect(next.json().code).toMatch(/^\d{6}$/);
    const existing = (await s.app.inject({ method: "GET", url: "/machines", headers: ADMIN })).json();
    expect(existing.some((m: { code: string }) => m.code === next.json().code)).toBe(false);
  });

  it("recusa alterar o código depois de criada", async () => {
    const { washer } = await seed(s);
    const denied = await s.app.inject({
      method: "PATCH",
      url: `/machines/${washer.id}`,
      headers: ADMIN,
      payload: { code: "999999" },
    });
    expect(denied.statusCode).toBe(400);
    const one = (await s.app.inject({ method: "GET", url: `/machines/${washer.id}`, headers: ADMIN })).json();
    expect(one.code).not.toBe("999999");
  });

  it("cadastra máquina sem placa ESP32", async () => {
    const { store } = await seed(s);
    const created = await s.app.inject({
      method: "POST",
      url: "/machines",
      headers: ADMIN,
      payload: { storeId: store.id, kind: "WASHER", label: "Lavadora 9", channel: 100 },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().deviceId).toBe("");
    expect(created.json().status).toBe("OFFLINE");
    expect(created.json().model).toBe("LG_FH069");
    expect(created.json().cycleMinutes).toBe(30);
  });

  it("usa 45 minutos para secadora e permite alterar o tempo de ciclo", async () => {
    const { store } = await seed(s);
    const dryer = (await s.app.inject({
      method: "POST",
      url: "/machines",
      headers: ADMIN,
      payload: { storeId: store.id, kind: "DRYER", label: "Secadora 9", channel: 100 },
    })).json();
    expect(dryer.cycleMinutes).toBe(45);
    const patched = await s.app.inject({ method: "PATCH", url: `/machines/${dryer.id}`, headers: ADMIN, payload: { cycleMinutes: 50 } });
    expect(patched.json().cycleMinutes).toBe(50);
    const invalid = await s.app.inject({ method: "PATCH", url: `/machines/${dryer.id}`, headers: ADMIN, payload: { cycleMinutes: 0 } });
    expect(invalid.statusCode).toBe(400);
  });

  it("salva e altera o maquinário da máquina", async () => {
    const { store } = await seed(s);
    const created = (await s.app.inject({
      method: "POST",
      url: "/machines",
      headers: ADMIN,
      payload: { storeId: store.id, kind: "WASHER", label: "Lavadora 9", channel: 100, model: "SPEED_QUEEN" },
    })).json();
    expect(created.model).toBe("SPEED_QUEEN");
    const patched = await s.app.inject({ method: "PATCH", url: `/machines/${created.id}`, headers: ADMIN, payload: { model: "MAMUTE" } });
    expect(patched.json().model).toBe("MAMUTE");
    const invalid = await s.app.inject({ method: "PATCH", url: `/machines/${created.id}`, headers: ADMIN, payload: { model: "XYZ" } });
    expect(invalid.statusCode).toBe(400);
  });

  it("não vende máquina sem placa ESP32 e não quebra a lista de placas", async () => {
    const { store } = await seed(s);
    const bare = (await s.app.inject({
      method: "POST",
      url: "/machines",
      headers: ADMIN,
      payload: { storeId: store.id, kind: "WASHER", label: "Lavadora 9", channel: 100 },
    })).json();
    const order = await s.app.inject({
      method: "POST",
      url: "/orders",
      headers: POS,
      payload: { storeId: store.id, machineIds: [bare.id] },
    });
    expect(order.statusCode).toBe(422);
    expect(order.json().error).toBe("machine_without_device");
    const devices = (await s.app.inject({ method: "GET", url: "/devices", headers: ADMIN })).json();
    expect(devices.every((d: { deviceId: string | null }) => d.deviceId)).toBe(true);
  });

  it("recusa a mesma placa ESP32 em duas máquinas", async () => {
    const { store } = await seed(s);
    const dup = await s.app.inject({
      method: "POST",
      url: "/machines",
      headers: ADMIN,
      payload: { storeId: store.id, kind: "DRYER", label: "Secadora 9", channel: 200, deviceId: "esp-1" },
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().message).toMatch(/já está/);
  });

  it("registra última liberação da máquina", async () => {
    const { washer } = await seed(s);
    await s.addDevice("esp-1");
    const rel = await s.app.inject({ method: "POST", url: "/boards/esp-1/release", headers: ADMIN });
    expect(rel.statusCode).toBe(202);
    const one = (await s.app.inject({ method: "GET", url: `/machines/${washer.id}`, headers: ADMIN })).json();
    expect(one.lastReleasedAt).toBeTruthy();
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADMIN, seed, startStack, waitFor, type Stack } from "./helpers.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
});
afterEach(async () => {
  await s.close();
});

const boards = async () => (await s.app.inject({ method: "GET", url: "/boards", headers: ADMIN })).json();

describe("placas ESP32 (menu Máquinas)", () => {
  it("exige token", async () => {
    expect((await s.app.inject({ method: "GET", url: "/boards" })).statusCode).toBe(401);
    expect((await s.app.inject({ method: "POST", url: "/boards/x/release" })).statusCode).toBe(401);
  });

  it("detecta placa nova, mostra online/offline e última vez vista", async () => {
    const d = await s.addDevice("esp-aabbccddeeff");
    await waitFor(async () => (await boards()).length === 1);
    let [b] = await boards();
    expect(b).toMatchObject({ deviceId: "esp-aabbccddeeff", online: true, registered: false });
    expect(b.lastSeenAt).toBeTruthy();
    await waitFor(async () => (await boards())[0].info?.fw === "simulator");

    await d.crash();
    await waitFor(async () => (await boards())[0].online === false);
    [b] = await boards();
    expect(b.lastSeenAt).toBeTruthy();
  });

  it("cadastra nome, loja e tipo", async () => {
    const { store } = await seed(s);
    await s.addDevice("esp-1");
    await waitFor(async () => (await boards()).length === 1);
    const res = await s.app.inject({
      method: "PATCH", url: "/boards/esp-1", headers: ADMIN,
      payload: { name: "Lavadora 3", storeId: store.id, kind: "WASHER" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ name: "Lavadora 3", storeName: "Loja 1", kind: "WASHER", registered: true });
    const bad = await s.app.inject({ method: "PATCH", url: "/boards/esp-1", headers: ADMIN, payload: { storeId: "nao-existe" } });
    expect(bad.statusCode).toBe(404);
    const unknown = await s.app.inject({ method: "PATCH", url: "/boards/zzz", headers: ADMIN, payload: { name: "x" } });
    expect(unknown.statusCode).toBe(404);
  });

  it("liberar máquina: placa recebe o comando, executa um pulso e confirma", async () => {
    const d = await s.addDevice("esp-1");
    await waitFor(async () => (await boards()).length === 1);
    const res = await s.app.inject({ method: "POST", url: "/boards/esp-1/release", headers: ADMIN });
    expect(res.statusCode).toBe(202);
    const cmd = res.json();
    await waitFor(async () => (await s.app.inject({ method: "GET", url: `/commands/${cmd.id}`, headers: ADMIN })).json().status === "DONE");
    expect(d.pulses).toHaveLength(1);
    const detail = (await s.app.inject({ method: "GET", url: `/commands/${cmd.id}`, headers: ADMIN })).json();
    expect(detail.events.map((e: any) => e.type)).toEqual(["CREATED", "SENT", "DONE"]);
    expect((await boards())[0].lastCommand).toMatchObject({ id: cmd.id, status: "DONE" });

    const list = (await s.app.inject({ method: "GET", url: "/commands", headers: ADMIN })).json();
    expect(list).toHaveLength(1);
  });

  it("recusa liberar placa offline ou desconhecida", async () => {
    const d = await s.addDevice("esp-1");
    await waitFor(async () => (await boards()).length === 1);
    await d.crash();
    await waitFor(() => !s.gateway.isOnline("esp-1"));
    const off = await s.app.inject({ method: "POST", url: "/boards/esp-1/release", headers: ADMIN });
    expect(off.statusCode).toBe(409);
    expect(off.json().error).toBe("device_offline");
    expect((await s.app.inject({ method: "POST", url: "/boards/zzz/release", headers: ADMIN })).statusCode).toBe(404);
  });

  it("sem ack a liberação manual fica enviada e depois não confirmada", async () => {
    await s.addDevice("esp-1", { dropAcks: true });
    await waitFor(async () => (await boards()).length === 1);
    const cmd = (await s.app.inject({ method: "POST", url: "/boards/esp-1/release", headers: ADMIN })).json();
    await waitFor(async () => (await s.app.inject({ method: "GET", url: `/commands/${cmd.id}`, headers: ADMIN })).json().status === "SENT");
    await s.db.query("UPDATE release_commands SET sent_at = $1", [new Date(Date.now() - 120_000)]);
    await s.app.releases.sweep();
    expect((await s.app.inject({ method: "GET", url: `/commands/${cmd.id}`, headers: ADMIN })).json().status).toBe("UNCONFIRMED");
  });
});

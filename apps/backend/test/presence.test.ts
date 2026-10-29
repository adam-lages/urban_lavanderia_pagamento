import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedIfEmpty } from "../src/demo-seed.js";
import { buildSegments, PresenceService } from "../src/services/presence.js";
import { ADMIN, POS, startStack, waitFor, type Stack } from "./helpers.js";

const at = (hhmm: string) => new Date(`2026-10-29T${hhmm}:00.000Z`);

describe("segmentos de operação", () => {
  it("corta o histórico na janela e ignora status repetido", () => {
    const segments = buildSegments(
      "online",
      [
        { status: "offline", at: at("02:00") },
        { status: "offline", at: at("03:00") },
        { status: "online", at: at("05:00") },
        { status: "offline", at: at("12:00") },
      ],
      at("00:00"),
      at("06:00"),
    );
    expect(segments).toEqual([
      { status: "online", from: at("00:00").toISOString(), to: at("02:00").toISOString() },
      { status: "offline", from: at("02:00").toISOString(), to: at("05:00").toISOString() },
      { status: "online", from: at("05:00").toISOString(), to: at("06:00").toISOString() },
    ]);
  });
});

describe("histórico de operação das placas", () => {
  let s: Stack;
  beforeEach(async () => {
    s = await startStack();
    await seedIfEmpty(s.db, undefined, new Date());
  });
  afterEach(async () => {
    await s.close();
  });

  const history = async () => (await s.app.inject({ method: "GET", url: "/stores/loja-algarve/presence", headers: ADMIN })).json();
  const machine = async (label: string) => (await history()).machines.find((m: { label: string }) => m.label === label);

  it("sem nada salvo, toda máquina fica offline nas últimas 24h", async () => {
    const body = await history();
    expect(Date.parse(body.to) - Date.parse(body.from)).toBe(24 * 3_600_000);
    expect(body.machines.map((m: { label: string }) => m.label)).toEqual(["Lavadora 1", "Lavadora 2", "Secadora 1", "Secadora 2"]);
    for (const m of body.machines) {
      expect(m.segments).toEqual([{ status: "offline", from: body.from, to: body.to }]);
      expect(m.onlineMs).toBe(0);
    }
  });

  it("usa o status real da placa ESP32 vinculada à máquina", async () => {
    const device = await s.addDevice("esp-alg-1");
    await waitFor(async () => (await machine("Lavadora 1")).segments.at(-1).status === "online");
    await device.crash();
    await waitFor(async () => (await machine("Lavadora 1")).segments.at(-1).status === "offline");
    expect((await machine("Lavadora 1")).segments.map((x: { status: string }) => x.status)).toEqual(["offline", "online", "offline"]);
    expect((await machine("Lavadora 2")).segments.map((x: { status: string }) => x.status)).toEqual(["offline"]);
  });

  it("grava só mudanças de status", async () => {
    const service = new PresenceService(s.db);
    await service.record("esp-novo", "online");
    await service.record("esp-novo", "online");
    await service.record("esp-novo", "offline");
    const rows = (await s.db.query("SELECT status FROM device_presence_events WHERE device_id = 'esp-novo' ORDER BY at")).rows;
    expect(rows.map((r) => r.status)).toEqual(["online", "offline"]);
  });

  it("recusa loja inexistente e quem não é franquia", async () => {
    expect((await s.app.inject({ method: "GET", url: "/stores/nao-existe/presence", headers: ADMIN })).statusCode).toBe(404);
    expect((await s.app.inject({ method: "GET", url: "/stores/loja-algarve/presence", headers: POS })).statusCode).toBe(401);
  });
});

import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Store, StorePresence } from "../../api";
import { renderApp } from "../../test/render";
import { formatDuration, uptimePercent } from "./operation/format";

const centro: Store = { id: "s1", name: "Centro", legalName: "", code: "10000010", address: "", cnpj: "11222333000181", role: "FRANQUIA", active: true };
const HOUR = 3_600_000;
const presence = (hours: number): StorePresence => {
  const to = Date.parse("2026-10-29T21:00:00.000Z");
  const from = to - hours * HOUR;
  const iso = (t: number) => new Date(t).toISOString();
  return {
    from: iso(from),
    to: iso(to),
    machines: [{
      machineId: "m1",
      label: "Lavadora 1",
      kind: "WASHER",
      deviceId: "esp-centro-1",
      onlineMs: (hours - 3) * HOUR,
      offlineMs: 3 * HOUR,
      segments: [
        { status: "online", from: iso(from), to: iso(to - 4 * HOUR) },
        { status: "offline", from: iso(to - 4 * HOUR), to: iso(to - HOUR) },
        { status: "online", from: iso(to - HOUR), to: iso(to) },
      ],
    }],
  };
};

let requested: string[];

beforeEach(() => {
  requested = [];
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://local.test");
    if (url.pathname === "/api/stores/s1") return Promise.resolve({ ok: true, status: 200, json: async () => centro });
    if (url.pathname === "/api/stores/s1/presence") {
      requested.push(url.searchParams.get("hours") ?? "");
      return Promise.resolve({ ok: true, status: 200, json: async () => presence(Number(url.searchParams.get("hours"))) });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({ message: "não mockado" }) });
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("tab Interface em operação", () => {
  it("mostra a linha do tempo online/offline de cada máquina e troca o período", async () => {
    const user = userEvent.setup();
    renderApp("/lavanderias/s1?tab=operacao", { token: "dev-admin-token" });
    expect(await screen.findByRole("tab", { name: "Interface em operação", selected: true })).toBeTruthy();
    expect(await screen.findByText("Lavadora 1")).toBeTruthy();
    expect(screen.getByText("esp-centro-1 · 87.5%")).toBeTruthy();
    expect(screen.getByText("Histórico últimas 24h")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Fora de operação por 3h" })).toBeTruthy();
    expect(screen.getAllByRole("img", { name: /^Em operação/ })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "7 dias" }));
    await waitFor(() => expect(screen.getByText("Histórico últimas 7 dias")).toBeTruthy());
    expect(requested).toEqual(["24", "168"]);
  });
});

describe("formatação da operação", () => {
  it("formata duração e disponibilidade", () => {
    expect(formatDuration(45 * 60_000)).toBe("45 min");
    expect(formatDuration(90 * 60_000)).toBe("1h 30min");
    expect(formatDuration(20 * HOUR)).toBe("20h");
    expect(uptimePercent(0, 0)).toBe(0);
    expect(uptimePercent(3, 1)).toBe(75);
  });
});

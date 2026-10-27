import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Board, Machine, Store } from "../api";
import { renderApp } from "../test/render";

const maranguape: Store = { id: "loja-maranguape-1", name: "Maranguape 1", code: "10000001", address: "Rua A", active: true };

const washer: Machine = {
  id: "m-mar-1",
  storeId: "loja-maranguape-1",
  storeName: "Maranguape 1",
  kind: "WASHER",
  label: "Lavadora 1",
  code: "100001",
  channel: 100,
  deviceId: "esp-mar-1",
  priceOverrideCents: null,
  active: true,
  blocked: false,
  online: true,
  status: "ONLINE",
  ip: "10.1.2.8",
  lastSeenAt: "2026-10-26T12:05:00.000Z",
  lastReleasedAt: "2026-10-26T11:00:00.000Z",
  lastBlockedAt: "",
};
const dryer: Machine = {
  ...washer,
  id: "m-mar-3",
  kind: "DRYER",
  label: "Secadora 1",
  code: "100003",
  channel: 300,
  deviceId: "esp-mar-3",
  online: false,
  status: "OFFLINE",
  ip: "",
  lastReleasedAt: "",
  blocked: true,
  active: false,
  lastBlockedAt: "2026-10-20T09:00:00.000Z",
};

let machines: Machine[];
let created: Machine | null;

function json(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

beforeEach(() => {
  machines = [washer, dryer];
  created = null;
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const parsed = new URL(String(input), "http://local.test");
    const method = init?.method ?? "GET";
    if (parsed.pathname === "/api/machines/next-code") return json({ code: "847291" });
    if (parsed.pathname === "/api/stores") return json([maranguape]);
    if (parsed.pathname === "/api/boards") {
      const board: Board = {
        deviceId: "esp-aabbccddeeff",
        name: null,
        storeId: null,
        storeName: null,
        kind: null,
        registered: false,
        online: true,
        firstSeenAt: "2026-10-26T12:00:00.000Z",
        lastSeenAt: "2026-10-26T12:05:00.000Z",
        info: { ip: "10.1.2.8" },
        lastCommand: null,
      };
      return json([board]);
    }
    if (parsed.pathname === "/api/machines" && method === "GET") {
      const storeId = parsed.searchParams.get("storeId") ?? "";
      return json(storeId ? machines.filter((m) => m.storeId === storeId) : machines);
    }
    if (parsed.pathname === "/api/machines/m-mar-1") return json(washer);
    if (parsed.pathname === "/api/machines/m-new" && created) return json(created);
    if (parsed.pathname === "/api/machines" && method === "POST") {
      const body = JSON.parse(String(init?.body));
      created = { ...washer, id: "m-new", label: body.label, deviceId: body.deviceId };
      return json(created, 201);
    }
    return json({ message: `não mockado ${parsed.pathname}` }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("página Máquinas", () => {
  it("pede a lavanderia e depois lista status e liberações", async () => {
    const user = userEvent.setup();
    renderApp("/maquinas", { token: "dev-admin-token" });
    expect(await screen.findByRole("heading", { name: "Máquinas" })).toBeTruthy();
    expect(screen.getByText("Selecione uma lavanderia")).toBeTruthy();
    await user.click(screen.getByLabelText("Filtrar por lavanderia"));
    await user.click(await screen.findByRole("option", { name: "Maranguape 1" }));
    expect(await screen.findByText("Lavadora 1")).toBeTruthy();
    expect(screen.getByText("Secadora 1")).toBeTruthy();
    expect(screen.getByText("ONLINE")).toBeTruthy();
    expect(screen.getByText("OFFLINE")).toBeTruthy();
    expect(screen.getByText("Bloqueada")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: /Bloqueadas/ }));
    expect(screen.queryByText("Lavadora 1")).toBeNull();
    expect(screen.getByText("Secadora 1")).toBeTruthy();
  });

  it("abre os detalhes da máquina com o IP da ESP32", async () => {
    const user = userEvent.setup();
    renderApp("/maquinas", { token: "dev-admin-token" });
    await user.click(await screen.findByLabelText("Filtrar por lavanderia"));
    await user.click(await screen.findByRole("option", { name: "Maranguape 1" }));
    await screen.findByText("Lavadora 1");
    await user.click(screen.getByRole("button", { name: "Detalhes de Lavadora 1" }));
    expect(await screen.findByRole("heading", { name: "Lavadora 1", level: 1 })).toBeTruthy();
    expect(screen.getByDisplayValue("10.1.2.8")).toBeTruthy();
    expect(screen.getByDisplayValue("esp-mar-1")).toBeTruthy();
    expect(screen.getByLabelText("Placa ESP32")).toBeTruthy();
  });

  it("cadastra uma máquina nova", async () => {
    const user = userEvent.setup();
    renderApp("/maquinas/nova", { token: "dev-admin-token" });
    await screen.findByRole("heading", { name: "Nova máquina" });
    const code = await screen.findByRole("textbox", { name: "Código" });
    expect(code).toHaveProperty("value", "847291");
    expect(code).toHaveProperty("disabled", true);
    const canal = screen.getByRole("textbox", { name: "Canal" });
    expect(canal).toHaveProperty("disabled", true);
    expect(canal).toHaveProperty("value", "100");
    await user.click(screen.getByRole("checkbox", { name: "Alterar canal" }));
    expect(screen.getByRole("textbox", { name: "Canal" })).toHaveProperty("disabled", false);
    await user.click(screen.getByLabelText("Lavanderia"));
    await user.click(await screen.findByRole("option", { name: "Maranguape 1" }));
    await user.type(screen.getByRole("textbox", { name: "Nome" }), "Lavadora 9");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Lavadora 9", level: 1 })).toBeTruthy());
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/machines") && c[1]?.method === "POST")).toBe(true);
  });
});

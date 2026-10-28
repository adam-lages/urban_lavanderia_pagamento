import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Board, Machine, Store } from "../api";
import { renderApp } from "../test/render";

const maranguape: Store = { id: "loja-maranguape-1", name: "Maranguape 1", legalName: "", code: "10000001", address: "Rua A", cnpj: "11222333000181", role: "FRANQUIA", active: true };

const washer: Machine = {
  id: "m-mar-1",
  storeId: "loja-maranguape-1",
  storeName: "Maranguape 1",
  kind: "WASHER",
  label: "Lavadora 1",
  code: "100001",
  channel: 100,
  model: "LG_FH069",
  cycleMinutes: 30,
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
  model: "LG_FH069",
  cycleMinutes: 30,
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
let washerState: Machine;

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
  washerState = { ...washer };
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const parsed = new URL(String(input), "http://local.test");
    const method = init?.method ?? "GET";
    if (parsed.pathname === "/api/machines/m-mar-1" && method === "PATCH") {
      const body = JSON.parse(String(init?.body));
      washerState = { ...washerState, blocked: body.blocked, active: !body.blocked };
      return json(washerState);
    }
    if (parsed.pathname === "/api/machines/next-code") return json({ code: "847291" });
    if (parsed.pathname === "/api/stores") return json([maranguape]);
    if (parsed.pathname === "/api/stores/loja-maranguape-1") return json(maranguape);
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
    if (parsed.pathname === "/api/machines/m-mar-1") return json(washerState);
    if (parsed.pathname === "/api/machines/m-mar-3") return json(dryer);
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

const tablePath = "/lavanderias/loja-maranguape-1?tab=maquinas";

describe("máquinas dentro da lavanderia", () => {
  it("lista status e liberações na tab Máquinas", async () => {
    renderApp(tablePath, { token: "dev-admin-token" });
    expect(await screen.findByText("Lavadora 1")).toBeTruthy();
    expect(screen.getByText("Secadora 1")).toBeTruthy();
    expect(screen.getByText("ONLINE")).toBeTruthy();
    expect(screen.getByText("OFFLINE")).toBeTruthy();
    expect(screen.queryByText("Bloqueada")).toBeNull();
    expect(screen.getByRole("button", { name: "Desbloquear" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Liberar" }).length).toBeGreaterThan(0);
  });

  it("filtra as máquinas pela busca", async () => {
    const user = userEvent.setup();
    renderApp(tablePath, { token: "dev-admin-token" });
    await screen.findByText("Lavadora 1");
    await user.type(screen.getByRole("textbox", { name: "Buscar máquina" }), "secadora");
    expect(screen.queryByText("Lavadora 1")).toBeNull();
    expect(screen.getByText("Secadora 1")).toBeTruthy();
  });

  it("não mostra mais o menu Máquinas", async () => {
    renderApp(tablePath, { token: "dev-admin-token" });
    await screen.findByText("Lavadora 1");
    expect(screen.queryByRole("link", { name: "Máquinas" })).toBeNull();
  });

  it("abre os detalhes pelo olho e permite bloquear", async () => {
    const user = userEvent.setup();
    renderApp(tablePath, { token: "dev-admin-token" });
    await user.click(await screen.findByRole("button", { name: "Detalhes de Lavadora 1" }));
    expect(await screen.findByRole("heading", { name: "Lavadora 1", level: 1 })).toBeTruthy();
    expect(screen.getByDisplayValue("10.1.2.8")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Maranguape 1" }).getAttribute("href")).toBe(tablePath);
    const lock = screen.getByRole("switch", { name: "Bloquear máquina" });
    expect(lock).toHaveProperty("checked", false);
    await user.click(lock);
    expect(await screen.findByText("BLOQUEADA")).toBeTruthy();
  });

  it("abre detalhes de máquina bloqueada com o switch ligado", async () => {
    renderApp("/lavanderias/loja-maranguape-1/maquinas/m-mar-3", { token: "dev-admin-token" });
    expect(await screen.findByRole("heading", { name: "Secadora 1", level: 1 })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Bloquear máquina" })).toHaveProperty("checked", true);
  });

  it("vai do detalhe para a edição dentro da lavanderia", async () => {
    const user = userEvent.setup();
    renderApp("/lavanderias/loja-maranguape-1/maquinas/m-mar-1", { token: "dev-admin-token" });
    await user.click(await screen.findByRole("button", { name: "Editar" }));
    expect(await screen.findByRole("heading", { name: "Editar máquina" })).toBeTruthy();
    const code = await screen.findByRole("textbox", { name: "Código" });
    expect(code).toHaveProperty("value", "100001");
    expect(code).toHaveProperty("readOnly", true);
  });

  it("cadastra uma máquina nova pela tab da lavanderia", async () => {
    const user = userEvent.setup();
    renderApp(tablePath, { token: "dev-admin-token" });
    await user.click(await screen.findByRole("button", { name: "Nova máquina" }));
    await screen.findByRole("heading", { name: "Nova máquina" });
    expect(await screen.findByRole("textbox", { name: "Código" })).toHaveProperty("value", "847291");
    await user.click(screen.getByRole("checkbox", { name: "Alterar canal" }));
    expect(screen.getByRole("textbox", { name: "Canal" })).toHaveProperty("disabled", false);
    expect(screen.getByLabelText("Maquinário").textContent).toContain("LG (FH069)");
    await user.click(screen.getByLabelText("Maquinário"));
    await user.click(await screen.findByRole("option", { name: "Speed Queen (200ms)" }));
    const cycle = screen.getByRole("textbox", { name: "Tempo de ciclo" });
    expect(cycle).toHaveProperty("value", "30");
    expect(cycle).toHaveProperty("disabled", true);
    await user.click(screen.getByLabelText("Tipo"));
    await user.click(await screen.findByRole("option", { name: "Secadora" }));
    expect(cycle).toHaveProperty("value", "45");
    await user.click(screen.getByRole("checkbox", { name: "Alterar tempo de ciclo" }));
    await user.clear(cycle);
    await user.type(cycle, "50");
    await user.type(screen.getByRole("textbox", { name: "Nome" }), "Lavadora 9");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Lavadora 9", level: 1 })).toBeTruthy());
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const post = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/api/machines") && c[1]?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ model: "SPEED_QUEEN_200MS", kind: "DRYER", cycleMinutes: 50 });
  });
});

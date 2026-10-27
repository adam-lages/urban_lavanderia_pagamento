import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Board } from "../api";
import { renderApp } from "../test/render";

const washer: Board = {
  deviceId: "esp-1",
  name: "Lavadora 1",
  storeId: "loja-1",
  storeName: "Centro",
  kind: "WASHER",
  registered: true,
  online: true,
  firstSeenAt: "2026-10-26T12:00:00.000Z",
  lastSeenAt: "2026-10-26T12:05:00.000Z",
  info: { rssi: -50, fw: "0.1.0" },
  lastCommand: null,
};

const dryerOffline: Board = {
  deviceId: "esp-2",
  name: "Secadora 2",
  storeId: "loja-1",
  storeName: "Centro",
  kind: "DRYER",
  registered: true,
  online: false,
  firstSeenAt: "2026-10-26T11:00:00.000Z",
  lastSeenAt: "2026-10-26T11:40:00.000Z",
  info: null,
  lastCommand: null,
};

function json(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.includes("/api/stores")) return json([]);
    if (url.endsWith("/api/boards") && method === "GET") return json([washer, dryerOffline]);
    if (url.includes("/api/boards/esp-1/release") && method === "POST") {
      return json({ id: "cmd-1", status: "PENDING", deviceId: "esp-1" });
    }
    if (url.includes("/api/commands/cmd-1")) {
      return json({ id: "cmd-1", status: "DONE", deviceId: "esp-1", events: [{ type: "DONE", detail: "ok", createdAt: "2026-10-26T12:06:00.000Z" }] });
    }
    return json({ message: `não mockado ${method} ${url}` }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("página Máquinas", () => {
  it("lista lava/seca, status e última vez visto", async () => {
    renderApp("/maquinas", { token: "dev-admin-token" });
    expect(await screen.findByRole("heading", { name: "Máquinas" })).toBeTruthy();
    expect(await screen.findByText("Lavadora 1")).toBeTruthy();
    expect(screen.getByText("Secadora 2")).toBeTruthy();
    expect(screen.getByText("Lava")).toBeTruthy();
    expect(screen.getByText("Seca")).toBeTruthy();
    expect(screen.getAllByText("Centro")).toHaveLength(2);
    expect(screen.getByText("Online")).toBeTruthy();
    expect(screen.getByText("Offline")).toBeTruthy();
    const liberar = screen.getAllByRole("button", { name: "Liberar" });
    expect(liberar[0].hasAttribute("disabled")).toBe(false);
    expect(liberar[1].hasAttribute("disabled")).toBe(true);
  });

  it("filtra pela aba de conexão e pela busca", async () => {
    const user = userEvent.setup();
    renderApp("/maquinas", { token: "dev-admin-token" });
    await screen.findByText("Lavadora 1");
    await user.click(screen.getByRole("tab", { name: /Sem conexão/ }));
    expect(screen.queryByText("Lavadora 1")).toBeNull();
    expect(screen.getByText("Secadora 2")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: /Todas/ }));
    await user.type(screen.getByRole("textbox", { name: "Buscar máquina" }), "esp-1");
    expect(screen.getByText("Lavadora 1")).toBeTruthy();
    expect(screen.queryByText("Secadora 2")).toBeNull();
  });

  it("só chama a API de liberação depois da confirmação", async () => {
    const user = userEvent.setup();
    renderApp("/maquinas", { token: "dev-admin-token" });
    await screen.findByText("Lavadora 1");
    await user.click(screen.getAllByRole("button", { name: "Liberar" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Liberar máquina" });
    expect(dialog).toBeTruthy();
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/release"))).toBe(false);
    await user.click(within(dialog).getByRole("button", { name: "Liberar" }));
    await screen.findByText("Confirmado");
    const releaseCall = fetchMock.mock.calls.find((c) => String(c[0]).includes("/boards/esp-1/release"));
    expect(releaseCall?.[1]).toMatchObject({ method: "POST" });
  });
});

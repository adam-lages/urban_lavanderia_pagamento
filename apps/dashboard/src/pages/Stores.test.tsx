import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Machine, Store } from "../api";
import { renderApp } from "../test/render";

const centro: Store = { id: "s1", name: "Centro", code: "10000010", address: "Rua A, 10", active: true };
const norte: Store = { id: "s2", name: "Norte", code: "10000020", address: "Av. B, 200", active: true };

const dryer: Machine = {
  id: "m2",
  storeId: "s1",
  kind: "DRYER",
  label: "Secadora 1",
  code: "100002",
  channel: 200,
  deviceId: "esp-2",
  priceOverrideCents: null,
  active: true,
  blocked: false,
  online: false,
  status: "OFFLINE",
};

const washer: Machine = {
  id: "m1",
  storeId: "s1",
  kind: "WASHER",
  label: "Lavadora 1",
  code: "100001",
  channel: 100,
  deviceId: "esp-1",
  priceOverrideCents: null,
  active: true,
  blocked: false,
  online: true,
  status: "ONLINE",
};

let stores: Store[];
let machines: Machine[];

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
  stores = [centro, norte];
  machines = [washer, dryer];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.includes("/api/machines") && method === "GET") return json(machines);
    if (url.includes("/api/boards/esp-1/release") && method === "POST") {
      return json({ id: "cmd-1", status: "PENDING", deviceId: "esp-1" }, 202);
    }
    if (url.endsWith("/api/stores") && method === "GET") return json(stores);
    if (url.endsWith("/api/stores/next-code") && method === "GET") return json({ code: "84729100" });
    if (url.endsWith("/api/stores") && method === "POST") {
      const body = JSON.parse(String(init?.body));
      const created = { id: "s3", name: body.name, code: body.code ?? "NEW", address: body.address ?? "", active: true };
      stores = [...stores, created];
      return json(created, 201);
    }
    const idMatch = url.match(/\/api\/stores\/([^/]+)$/);
    if (idMatch && method === "GET") {
      const found = stores.find((s) => s.id === idMatch[1]);
      return found ? json(found) : json({ message: "não encontrada" }, 404);
    }
    if (url.includes("/api/machines/") && method === "PATCH") {
      const body = JSON.parse(String(init?.body));
      machines = machines.map((m) =>
        url.includes(m.id) ? { ...m, blocked: body.blocked ?? m.blocked, active: body.blocked === undefined ? m.active : !body.blocked } : m,
      );
      return json(machines[0]);
    }
    if (idMatch && method === "PATCH") {
      const body = JSON.parse(String(init?.body));
      stores = stores.map((s) => (s.id === idMatch[1] ? { ...s, ...body } : s));
      return json(stores.find((s) => s.id === idMatch[1]));
    }
    if (idMatch && method === "DELETE") {
      stores = stores.filter((s) => s.id !== idMatch[1]);
      return Promise.resolve({ ok: true, status: 204, json: async () => ({}) });
    }
    return json({ message: `não mockado ${method} ${url}` }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("página Lavanderias", () => {
  it("mostra loading no centro da tabela enquanto busca", async () => {
    let send!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      send = resolve;
    });
    const prev = fetch as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<unknown>;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/api/stores") && (init?.method ?? "GET") === "GET") {
        return pending.then(() => json(stores));
      }
      return prev(input, init);
    });
    renderApp("/lavanderias", { token: "dev-admin-token" });
    expect(await screen.findByRole("progressbar", { name: "Carregando" })).toBeTruthy();
    expect(screen.queryByText("Centro")).toBeNull();
    send(undefined);
    expect(await screen.findByText("Centro")).toBeTruthy();
    expect(screen.queryByRole("progressbar", { name: "Carregando" })).toBeNull();
  });

  it("lista nome, endereço e abre os detalhes", async () => {
    const user = userEvent.setup();
    renderApp("/lavanderias", { token: "dev-admin-token" });
    expect(await screen.findByRole("heading", { name: "Lavanderias" })).toBeTruthy();
    expect(await screen.findByText("Centro")).toBeTruthy();
    expect(screen.getByText("Rua A, 10")).toBeTruthy();
    expect(screen.getByText("Norte")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Detalhes de Centro" }));
    expect(await screen.findByRole("heading", { name: "Centro", level: 1 })).toBeTruthy();
    expect(screen.getAllByText("Rua A, 10").length).toBeGreaterThan(0);
    expect(screen.getByText("Código 10000010")).toBeTruthy();
    const codeOnDetails = screen.getByRole("textbox", { name: "Código" });
    expect(codeOnDetails).toHaveProperty("value", "10000010");
    expect(codeOnDetails).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Editar lavanderia" })).toBeNull();
  });

  it("filtra pelo campo de busca", async () => {
    const user = userEvent.setup();
    renderApp("/lavanderias", { token: "dev-admin-token" });
    await screen.findByText("Centro");
    await user.type(screen.getByRole("textbox", { name: "Buscar lavanderia" }), "norte");
    expect(screen.getByText("Norte")).toBeTruthy();
    expect(screen.queryByText("Centro")).toBeNull();
  });

  it("cadastra uma lavanderia nova", async () => {
    const user = userEvent.setup();
    renderApp("/lavanderias", { token: "dev-admin-token" });
    await screen.findByText("Centro");
    await user.click(screen.getByRole("button", { name: "Nova lavanderia" }));
    expect(await screen.findByRole("heading", { name: "Nova lavanderia" })).toBeTruthy();
    const generated = await screen.findByRole("textbox", { name: "Código" });
    expect(generated).toHaveProperty("value", "84729100");
    expect(generated).toHaveProperty("disabled", true);
    expect(generated).toHaveProperty("readOnly", true);
    await user.type(screen.getByLabelText("Nome"), "Sul");
    await user.type(screen.getByLabelText("Endereço"), "Rua C, 3");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("heading", { name: "Sul", level: 1 })).toBeTruthy();
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const post = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/api/stores") && c[1]?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ name: "Sul", address: "Rua C, 3", code: "84729100" });
  });

  it("mostra as máquinas da lavanderia nos detalhes", async () => {
    const user = userEvent.setup();
    renderApp("/lavanderias/s1", { token: "dev-admin-token" });
    await screen.findByRole("heading", { name: "Centro", level: 1 });
    expect(screen.getByRole("tab", { name: "Dados" })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Máquinas" }));
    expect(await screen.findByText("Lavadoras")).toBeTruthy();
    expect(screen.getByText("Secadoras")).toBeTruthy();
    expect(screen.getByText("Lavadora 1")).toBeTruthy();
    expect(screen.getByText("Secadora 1")).toBeTruthy();
    expect(screen.getByText("100001")).toBeTruthy();
    expect(screen.getByText("ONLINE")).toBeTruthy();
    const liberar = screen.getAllByRole("button", { name: "Liberar" });
    expect(liberar[0].hasAttribute("disabled")).toBe(false);
    expect(liberar[1].hasAttribute("disabled")).toBe(true);
  });

  it("pede confirmação antes de liberar", async () => {
    const user = userEvent.setup();
    renderApp("/lavanderias/s1", { token: "dev-admin-token" });
    await user.click(await screen.findByRole("tab", { name: "Máquinas" }));
    await user.click((await screen.findAllByRole("button", { name: "Liberar" }))[0]);
    const dialog = await screen.findByRole("dialog", { name: "Liberar máquina" });
    expect(within(dialog).getByText(/Deseja realmente liberar a Lavadora 1/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Liberar máquina" })).toBeNull();
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/release"))).toBe(false);
    await user.click(screen.getAllByRole("button", { name: "Liberar" })[0]);
    await user.click(within(await screen.findByRole("dialog", { name: "Liberar máquina" })).getByRole("button", { name: "Liberar" }));
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/boards/esp-1/release") && c[1]?.method === "POST")).toBe(true);
  });

  it("abre o mesmo formulário para editar a partir dos detalhes", async () => {
    const user = userEvent.setup();
    renderApp("/lavanderias/s1", { token: "dev-admin-token" });
    await screen.findByRole("heading", { name: "Centro", level: 1 });
    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(await screen.findByRole("heading", { name: "Editar lavanderia" })).toBeTruthy();
    expect(await screen.findByDisplayValue("Centro")).toBeTruthy();
    const code = screen.getByRole("textbox", { name: "Código" });
    expect(code).toHaveProperty("value", "10000010");
    expect(code).toHaveProperty("disabled", true);
    expect(code).toHaveProperty("readOnly", true);
  });

  it("não libera máquina bloqueada ou offline", async () => {
    machines = [{ ...washer, blocked: true, status: "ONLINE" }];
    const user = userEvent.setup();
    renderApp("/lavanderias/s1", { token: "dev-admin-token" });
    await user.click(await screen.findByRole("tab", { name: "Máquinas" }));
    const liberar = await screen.findByRole("button", { name: "Liberar" });
    expect(liberar.hasAttribute("disabled")).toBe(true);
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/release"))).toBe(false);
  });

  it("exclui depois da confirmação", async () => {
    const user = userEvent.setup();
    renderApp("/lavanderias/s1", { token: "dev-admin-token" });
    await screen.findByRole("heading", { name: "Centro", level: 1 });
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    const dialog = screen.getByRole("dialog", { name: "Excluir lavanderia" });
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("heading", { name: "Lavanderias" })).toBeTruthy();
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/stores/s1") && c[1]?.method === "DELETE")).toBe(true);
  });
});

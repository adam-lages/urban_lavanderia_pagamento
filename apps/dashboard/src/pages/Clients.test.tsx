import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Customer, Sale } from "../api";
import { renderApp } from "../test/render";

const ana: Customer = {
  id: "cli-ana",
  name: "Ana Souza",
  birthDate: "1992-03-14",
  age: 34,
  cpf: "52998224725",
  email: "ana.souza@email.com",
  phone: "5581981110001",
  blocked: false,
  storeId: "loja-algarve",
  storeName: "Algarve",
  createdAt: "2026-01-12T10:15:00.000Z",
};
const carla: Customer = {
  ...ana,
  id: "cli-carla",
  name: "Carla Mendes",
  cpf: "11144477735",
  email: "carla.mendes@email.com",
  phone: "5581981110003",
  blocked: true,
};

const anaPix: Sale = {
  id: "sale-1",
  orderId: "sale-1",
  storeId: "loja-maranguape-1",
  storeName: "Maranguape 1",
  customerName: "Ana Souza",
  customerCpf: "52998224725",
  machineLabel: "Lavadora 1",
  paidAt: "2026-09-02T13:10:00.000Z",
  amountCents: 1800,
  paymentMethod: "PIX",
  couponCode: "",
  voucherCode: "",
  authCode: "",
  cardBrand: "",
  cardNumber: "",
};
const anaDebit: Sale = {
  ...anaPix,
  id: "sale-3",
  orderId: "sale-3",
  machineLabel: "Secadora 1",
  paidAt: "2026-09-12T11:05:00.000Z",
  amountCents: 1200,
  paymentMethod: "DEBIT",
  authCode: "D4E5F6",
  cardBrand: "Visa",
  cardNumber: "**** 8890",
};

let items: Customer[];
let anaState: Customer;
let anaSales: Sale[];

function json(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

beforeEach(() => {
  items = [ana, carla];
  anaState = { ...ana };
  anaSales = [anaPix, anaDebit];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const parsed = new URL(url, "http://local.test");
    const method = init?.method ?? "GET";
    if (parsed.pathname === "/api/customers/cli-ana" && method === "PATCH") {
      const body = JSON.parse(String(init?.body));
      anaState = { ...anaState, blocked: body.blocked };
      return json(anaState);
    }
    if (parsed.pathname === "/api/customers/cli-ana") return json(anaState);
    if (parsed.pathname === "/api/sales") {
      const customerId = parsed.searchParams.get("customerId") ?? "";
      const filtered = customerId === "cli-ana" ? anaSales : [];
      return json({ items: filtered, total: filtered.length });
    }
    if (parsed.pathname === "/api/stores") {
      return json([
        { id: "loja-maranguape-1", name: "Maranguape 1", code: "10000001", address: "", active: true },
        { id: "loja-algarve", name: "Algarve", code: "10000003", address: "", active: true },
      ]);
    }
    if (parsed.pathname === "/api/customers") {
      const name = (parsed.searchParams.get("name") ?? "").toLowerCase();
      const cpf = (parsed.searchParams.get("cpf") ?? "").replace(/\D/g, "");
      const storeId = parsed.searchParams.get("storeId") ?? "";
      const filtered = items.filter((c) =>
        (!name || c.name.toLowerCase().includes(name)) &&
        (!cpf || c.cpf.includes(cpf)) &&
        (!storeId || (storeId === "loja-maranguape-1" && c.id === "cli-ana")),
      );
      const page = Number(parsed.searchParams.get("page") ?? 0);
      const limit = Number(parsed.searchParams.get("limit") ?? 10);
      return json({ items: filtered.slice(page * limit, page * limit + limit), total: filtered.length });
    }
    return json({ message: `não mockado ${url}` }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("página Listagem de clientes", () => {
  it("mostra colunas, status e abre os detalhes", async () => {
    const user = userEvent.setup();
    renderApp("/clientes", { token: "dev-admin-token" });
    expect(await screen.findByRole("heading", { name: "Listagem de clientes" })).toBeTruthy();
    expect(await screen.findByText("Ana Souza")).toBeTruthy();
    expect(screen.getByText("529.982.247-25")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Unidade" })).toBeTruthy();
    expect(screen.getAllByText("Algarve").length).toBeGreaterThan(0);
    expect(screen.getAllByText("34 anos").length).toBeGreaterThan(0);
    expect(screen.getByText("ATIVO")).toBeTruthy();
    expect(screen.getByText("BLOQUEADO")).toBeTruthy();
    const whats = screen.getAllByRole("link", { name: "WhatsApp" });
    expect(whats[0].getAttribute("href")).toBe("https://wa.me/5581981110001");
    await user.click(screen.getByRole("button", { name: "Detalhes de Ana Souza" }));
    expect(await screen.findByRole("heading", { name: "Ana Souza", level: 1 })).toBeTruthy();
    expect(screen.getByDisplayValue("ana.souza@email.com")).toBeTruthy();
    expect(screen.getByText("ATIVO")).toBeTruthy();
    await user.click(screen.getByRole("switch", { name: "Bloquear cliente" }));
    expect(await screen.findByText("BLOQUEADO")).toBeTruthy();
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/customers/cli-ana") && c[1]?.method === "PATCH")).toBe(true);
    await user.click(screen.getByRole("tab", { name: "Compras" }));
    expect(await screen.findByText("Lavadora 1")).toBeTruthy();
    expect(screen.getByText("Secadora 1")).toBeTruthy();
    expect(screen.getByText("PIX")).toBeTruthy();
    expect(screen.getByText("Débito")).toBeTruthy();
    expect(screen.getByText("D4E5F6")).toBeTruthy();
    expect(screen.getByText("Visa")).toBeTruthy();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("customerId=cli-ana"))).toBe(true);
  });

  it("filtra por nome só ao pesquisar e limpa os filtros", async () => {
    const user = userEvent.setup();
    renderApp("/clientes", { token: "dev-admin-token" });
    await screen.findByText("Carla Mendes");
    await user.type(screen.getByRole("textbox", { name: "Filtrar por nome" }), "ana");
    expect(screen.getByText("Carla Mendes")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Pesquisar" }));
    await waitFor(() => expect(screen.queryByText("Carla Mendes")).toBeNull());
    expect(screen.getByText("Ana Souza")).toBeTruthy();
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("name=ana"))).toBe(true);
    await user.click(screen.getByRole("button", { name: "Limpar" }));
    expect(await screen.findByText("Carla Mendes")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Filtrar por nome" })).toHaveProperty("value", "");
  });

  it("filtra os clientes pela lavanderia só ao pesquisar", async () => {
    const user = userEvent.setup();
    renderApp("/clientes", { token: "dev-admin-token" });
    await screen.findByText("Carla Mendes");
    await user.click(screen.getByLabelText("Filtrar por lavanderia"));
    await user.click(await screen.findByRole("option", { name: "Maranguape 1" }));
    expect(screen.getByText("Carla Mendes")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Pesquisar" }));
    await waitFor(() => expect(screen.queryByText("Carla Mendes")).toBeNull());
    expect(screen.getByText("Ana Souza")).toBeTruthy();
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("storeId=loja-maranguape-1"))).toBe(true);
  });

  it("exporta a planilha com os clientes", async () => {
    const user = userEvent.setup();
    const click = vi.fn();
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:clientes");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = click;
    renderApp("/clientes", { token: "dev-admin-token" });
    await screen.findByText("Ana Souza");
    await user.click(screen.getByRole("button", { name: "Exportar" }));
    expect(click).toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
    HTMLAnchorElement.prototype.click = orig;
    create.mockRestore();
    revoke.mockRestore();
  });
});

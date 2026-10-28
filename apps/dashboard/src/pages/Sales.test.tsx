import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sale, Store } from "../api";
import { renderApp } from "../test/render";

const maranguape: Store = { id: "loja-maranguape-1", name: "Maranguape 1", legalName: "", code: "10000001", address: "Rua A", cnpj: "11222333000181", role: "FRANQUIA", active: true };
const algarve: Store = { id: "loja-algarve", name: "Algarve", legalName: "", code: "10000003", address: "Rua B", cnpj: "55666777000181", role: "FRANQUEADO", active: true };

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
const brunoCard: Sale = {
  ...anaPix,
  id: "sale-2",
  orderId: "sale-2",
  customerName: "Bruno Lima",
  customerCpf: "39053344705",
  machineLabel: "Lavadora 2",
  paymentMethod: "CREDIT",
  couponCode: "LAVA10",
  authCode: "A1B2C3",
  cardBrand: "Mastercard",
  cardNumber: "**** 4412",
};
const fabio: Sale = {
  ...anaPix,
  id: "sale-7",
  orderId: "sale-7",
  storeId: "loja-algarve",
  storeName: "Algarve",
  customerName: "Fábio Nunes",
  customerCpf: "98765432100",
  machineLabel: "Lavadora 1",
  paymentMethod: "DEBIT",
};

let sales: Sale[];

function json(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

beforeEach(() => {
  sales = [anaPix, brunoCard, fabio];
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const parsed = new URL(String(input), "http://local.test");
    if (parsed.pathname === "/api/stores") return json([maranguape, algarve]);
    if (parsed.pathname === "/api/sales") {
      const storeId = parsed.searchParams.get("storeId") ?? "";
      const name = (parsed.searchParams.get("customerName") ?? "").toLowerCase();
      const filtered = sales.filter((s) =>
        (!storeId || s.storeId === storeId) && (!name || s.customerName.toLowerCase().includes(name)),
      );
      return json({ items: filtered, total: filtered.length });
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

async function searchStore(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole("tab", { name: name === "Algarve" ? /Franqueados/ : /Franquia/ }));
  await user.click(await screen.findByLabelText("Filtrar por lavanderia"));
  await user.click(await screen.findByRole("option", { name }));
  await user.click(screen.getByRole("button", { name: "Pesquisar" }));
}

describe("página Vendas", () => {
  it("só lista depois de escolher a lavanderia e pesquisar", async () => {
    renderApp("/vendas", { token: "dev-admin-token" });
    expect(await screen.findByText("Selecione uma lavanderia")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pesquisar" })).toHaveProperty("disabled", true);
    expect(screen.queryByText("Ana Souza")).toBeNull();
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/sales"))).toBe(false);
  });

  it("não mostra a tab Todos", async () => {
    renderApp("/vendas", { token: "dev-admin-token" });
    expect(await screen.findByRole("tab", { name: /Franquia/, selected: true })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /Todos/ })).toBeNull();
  });

  it("separa as lavanderias por franquia e franqueados", async () => {
    const user = userEvent.setup();
    renderApp("/vendas", { token: "dev-admin-token" });
    await user.click(await screen.findByRole("tab", { name: /Franqueados/ }));
    await user.click(screen.getByLabelText("Filtrar por lavanderia"));
    expect(await screen.findByRole("option", { name: "Algarve" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Maranguape 1" })).toBeNull();
  });

  it("mostra cliente, máquina, valor e método", async () => {
    const user = userEvent.setup();
    renderApp("/vendas", { token: "dev-admin-token" });
    expect(await screen.findByRole("heading", { name: "Vendas" })).toBeTruthy();
    await searchStore(user, "Maranguape 1");
    expect(await screen.findByText("Ana Souza")).toBeTruthy();
    expect(screen.getByText("529.982.247-25")).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Unidade" })).toBeNull();
    expect(screen.getAllByText("Lavadora 1").length).toBeGreaterThan(0);
    expect(screen.getByText("PIX")).toBeTruthy();
    expect(screen.getByText("Crédito")).toBeTruthy();
    expect(screen.getByText("LAVA10")).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Voucher" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Stone Authcode" })).toBeNull();
    expect(screen.queryByText("A1B2C3")).toBeNull();
    expect(screen.queryByText("Mastercard")).toBeNull();
  });

  it("abre o painel lateral com os dados da venda", async () => {
    const user = userEvent.setup();
    renderApp("/vendas", { token: "dev-admin-token" });
    await searchStore(user, "Maranguape 1");
    await screen.findByText("Bruno Lima");
    await user.click(screen.getByRole("button", { name: "Detalhes da venda de Bruno Lima" }));
    expect(await screen.findByRole("heading", { name: "Detalhes da venda" })).toBeTruthy();
    expect(screen.getByText("A1B2C3")).toBeTruthy();
    expect(screen.getByText("Mastercard")).toBeTruthy();
    expect(screen.getByText("**** 4412")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Fechar detalhes" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Detalhes da venda" })).toBeNull());
  });

  it("filtra por lavanderia e por nome só ao pesquisar", async () => {
    const user = userEvent.setup();
    renderApp("/vendas", { token: "dev-admin-token" });
    await searchStore(user, "Algarve");
    expect(await screen.findByText("Fábio Nunes")).toBeTruthy();
    expect(screen.queryByText("Ana Souza")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Limpar" }));
    expect(await screen.findByText("Selecione uma lavanderia")).toBeTruthy();
    await searchStore(user, "Maranguape 1");
    expect(await screen.findByText("Ana Souza")).toBeTruthy();
    await user.type(screen.getByRole("textbox", { name: "Filtrar por nome do cliente" }), "bruno");
    expect(screen.getByText("Ana Souza")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Pesquisar" }));
    await waitFor(() => expect(screen.queryByText("Ana Souza")).toBeNull());
    expect(screen.getByText("Bruno Lima")).toBeTruthy();
  });
});

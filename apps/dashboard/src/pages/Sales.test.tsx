import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sale, Store } from "../api";
import { renderApp } from "../test/render";
import { rangeFor } from "./home/periods";

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
  machineKind: "WASHER",
  servicesCount: 1,
  paidAt: "2026-09-02T13:10:00.000Z",
  amountCents: 1800,
  paidCents: 1800,
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
const brunoDryer: Sale = {
  ...brunoCard,
  id: "sale-2b",
  machineLabel: "Secadora 3",
  machineKind: "DRYER",
  amountCents: 1200,
  paidCents: 3000,
  servicesCount: 2,
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
  sales = [anaPix, { ...brunoCard, servicesCount: 2, paidCents: 3000 }, fabio];
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const parsed = new URL(String(input), "http://local.test");
    if (parsed.pathname === "/api/stores") return json([maranguape, algarve]);
    if (parsed.pathname === "/api/sales") {
      const storeId = parsed.searchParams.get("storeId") ?? "";
      const name = (parsed.searchParams.get("customerName") ?? "").toLowerCase();
      const cpf = (parsed.searchParams.get("customerCpf") ?? "").replace(/\D/g, "");
      const orderId = parsed.searchParams.get("orderId") ?? "";
      const filtered = sales.filter((s) =>
        (!storeId || s.storeId === storeId)
        && (!name || s.customerName.toLowerCase().includes(name))
        && (!cpf || s.customerCpf.includes(cpf))
        && (!orderId || s.orderId === orderId),
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
  await user.click(await screen.findByLabelText("Unidade"));
  await user.click(await screen.findByRole("option", { name }));
  await user.click(screen.getByRole("button", { name: "Pesquisar" }));
}

describe("página Vendas", () => {
  it("só lista depois de escolher a lavanderia e pesquisar", async () => {
    renderApp("/vendas", { token: "dev-admin-token" });
    expect(await screen.findByText("Selecione uma lavanderia")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pesquisar" })).toHaveProperty("disabled", true);
    expect(screen.queryByText("Ana Souza")).toBeNull();
    const today = rangeFor("today");
    const from = screen.getByLabelText("Data inicial") as HTMLInputElement;
    const to = screen.getByLabelText("Data final") as HTMLInputElement;
    expect(from.value).toBe(today.from);
    expect(to.value).toBe(today.to);
    expect(from.disabled).toBe(true);
    expect(to.disabled).toBe(true);
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
    await user.click(screen.getByLabelText("Unidade"));
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

  it("mostra o extrato com dados da lavanderia e do cliente e baixa ao salvar", async () => {
    const user = userEvent.setup();
    const click = vi.fn();
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:comprovante");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = click;
    sales.push(brunoDryer);
    renderApp("/vendas", { token: "dev-admin-token" });
    await searchStore(user, "Maranguape 1");
    await screen.findAllByText("Bruno Lima");
    expect(screen.getByRole("columnheader", { name: "Qtd. serviços" })).toBeTruthy();
    expect(screen.getAllByRole("cell", { name: "2" })).toHaveLength(2);
    await user.click(screen.getAllByRole("button", { name: "Extrato da venda de Bruno Lima" })[0]);
    expect(await screen.findByRole("heading", { name: "Extrato" })).toBeTruthy();
    const receipt = await screen.findByLabelText("Comprovante");
    expect(receipt.textContent).toContain("Maranguape 1");
    expect(receipt.textContent).toContain("CNPJ: 11.222.333/0001-81");
    expect(receipt.textContent).toContain("Data e hora");
    expect(receipt.textContent).toContain("Rua A");
    expect(receipt.textContent).toContain("Bruno Lima");
    expect(receipt.textContent).toContain("390.533.447-05");
    expect(receipt.textContent).toContain("Lavar - Lavadora 2");
    expect(receipt.textContent).toContain("Secar - Secadora 3");
    expect(receipt.textContent).not.toContain("Fábio Nunes");
    expect(receipt.textContent).toContain("Crédito");
    expect(receipt.textContent).toMatch(/Desconto:\s+Cupom LAVA10/);
    expect(receipt.querySelector("strong")?.textContent).toMatch(/^Total:\s+R\$\s30,00$/);
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(click).toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
    HTMLAnchorElement.prototype.click = orig;
    create.mockRestore();
    revoke.mockRestore();
  });

  it("fecha o extrato ao cancelar sem baixar", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(URL, "createObjectURL");
    renderApp("/vendas", { token: "dev-admin-token" });
    await searchStore(user, "Maranguape 1");
    await screen.findByText("Ana Souza");
    await user.click(screen.getByRole("button", { name: "Extrato da venda de Ana Souza" }));
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Extrato" })).toBeNull());
    expect(create).not.toHaveBeenCalled();
    create.mockRestore();
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
    const today = rangeFor("today");
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => {
      const url = String(c[0]);
      return url.includes("/sales") && url.includes(`from=${today.from}`) && url.includes(`to=${today.to}`);
    })).toBe(true);
    await user.click(screen.getByRole("button", { name: /Mais opções/ }));
    await user.type(screen.getByRole("textbox", { name: "Filtrar por nome do cliente" }), "bruno");
    expect(screen.getByText("Ana Souza")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Pesquisar" }));
    await waitFor(() => expect(screen.queryByText("Ana Souza")).toBeNull());
    expect(screen.getByText("Bruno Lima")).toBeTruthy();
  });

  it("filtra por CPF nas opções extras", async () => {
    const user = userEvent.setup();
    renderApp("/vendas", { token: "dev-admin-token" });
    await searchStore(user, "Maranguape 1");
    expect(await screen.findByText("Ana Souza")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Mais opções/ }));
    await user.type(screen.getByRole("textbox", { name: "Filtrar por CPF" }), "390.533.447-05");
    await user.click(screen.getByRole("button", { name: "Pesquisar" }));
    await waitFor(() => expect(screen.queryByText("Ana Souza")).toBeNull());
    expect(screen.getByText("Bruno Lima")).toBeTruthy();
  });

  it("baixa o Excel com o resultado do filtro", async () => {
    const user = userEvent.setup();
    const click = vi.fn();
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:vendas");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = click;
    renderApp("/vendas", { token: "dev-admin-token" });
    expect(screen.getByRole("button", { name: "Excel" })).toHaveProperty("disabled", true);
    await searchStore(user, "Maranguape 1");
    await screen.findByText("Ana Souza");
    await user.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(create).toHaveBeenCalled();
    HTMLAnchorElement.prototype.click = orig;
    create.mockRestore();
    revoke.mockRestore();
  });
});

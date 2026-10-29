import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Voucher } from "../api";
import { renderApp } from "../test/render";

const credit: Voucher = {
  id: "v-1",
  code: "VCABC12345",
  storeId: "loja-maranguape-1",
  storeName: "Maranguape 1",
  storeRole: "FRANQUIA",
  category: "CREDITO",
  amountCents: 5000,
  balanceCents: 3200,
  uses: 1,
  recurring: false,
  validFrom: "",
  validTo: "",
  restrictStore: false,
  restrictStoreId: "",
  restrictStoreName: "",
  storeValueLimitCents: null,
  storeUsageLimit: null,
  restrictCustomer: false,
  customerId: "",
  customerName: "",
  customerValueLimitCents: null,
  customerUsageLimit: null,
  restrictService: false,
  service: "",
  serviceValueLimitCents: null,
  serviceUsageLimit: null,
  createdAt: "2026-03-01T10:00:00.000Z",
};

function json(data: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => data });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const parsed = new URL(String(input), "http://local.test");
    const method = init?.method ?? "GET";
    if (parsed.pathname === "/api/stores") {
      return json([
        { id: "loja-maranguape-1", name: "Maranguape 1", code: "10000001", address: "", role: "FRANQUIA", active: true },
        { id: "loja-algarve", name: "Algarve", code: "10000003", address: "", role: "FRANQUEADO", active: true },
      ]);
    }
    if (parsed.pathname === "/api/customers") return json({ items: [], total: 0 });
    if (parsed.pathname === "/api/vouchers" && method === "POST") {
      const body = JSON.parse(String(init?.body));
      return json({ ...credit, id: "v-1", amountCents: body.amountCents, balanceCents: body.amountCents }, 201);
    }
    if (parsed.pathname === "/api/vouchers/v-1") return json(credit);
    if (parsed.pathname === "/api/vouchers") {
      const storeId = parsed.searchParams.get("storeId");
      const items = storeId === credit.storeId ? [credit] : [];
      return json({ items, total: items.length });
    }
    return json({ message: "não mockado" }, 404);
  }));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("página Carteira", () => {
  it("aparece no menu abaixo de Cupons", async () => {
    renderApp("/", { token: "dev-admin-token" });
    const nav = await screen.findByRole("navigation", { name: "Menu principal" });
    const text = nav.textContent ?? "";
    expect(text.indexOf("Carteira")).toBeGreaterThan(text.indexOf("Cupons"));
  });

  it("lista vouchers com valor e saldo e abre os detalhes", async () => {
    const user = userEvent.setup();
    renderApp("/carteira", { token: "dev-admin-token" });
    expect(await screen.findByText("Selecione uma lavanderia")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /Todos/ })).toBeNull();
    await user.click(screen.getByLabelText("Filtrar por lavanderia"));
    await user.click(await screen.findByRole("option", { name: "Maranguape 1" }));
    await user.click(screen.getByRole("button", { name: "Pesquisar" }));
    expect(await screen.findByText("VCABC12345")).toBeTruthy();
    expect(screen.getByText("Crédito")).toBeTruthy();
    expect(screen.getByText(/50,00/)).toBeTruthy();
    expect(screen.getByText(/32,00/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Detalhes de VCABC12345" }));
    expect(await screen.findByRole("heading", { name: "VCABC12345" })).toBeTruthy();
    expect(screen.getByLabelText("Saldo disponível")).toHaveProperty("value", expect.stringContaining("32,00"));
  });

  it("cadastra um voucher com valor monetário", async () => {
    const user = userEvent.setup();
    renderApp("/carteira/novo", { token: "dev-admin-token" });
    await user.click(await screen.findByRole("combobox", { name: (_, el) => el.getAttribute("aria-label") === "Franqueador" }));
    await user.click(await screen.findByRole("option", { name: "Maranguape 1" }));
    await user.click(screen.getByRole("combobox", { name: (_, el) => el.getAttribute("aria-label") === "Categoria" }));
    await user.click(await screen.findByRole("option", { name: "Crédito" }));
    await user.type(screen.getByLabelText("R$ Valor"), "5000");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("heading", { name: "VCABC12345" })).toBeTruthy();
  });

  it("esconde o cadastro para o franqueado", async () => {
    renderApp("/carteira", { token: "session-token", role: "FRANQUEADO" });
    expect(await screen.findByRole("heading", { name: "Carteira" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Novo voucher" })).toBeNull();
  });
});

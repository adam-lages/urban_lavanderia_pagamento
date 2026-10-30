import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Coupon } from "../api";
import { renderApp } from "../test/render";

const lava10: Coupon = {
  id: "cup-1",
  code: "LAVA10",
  generated: true,
  storeId: "loja-maranguape-1",
  storeName: "Maranguape 1",
  storeRole: "FRANQUIA",
  allFranchiseStores: true,
  percent: true,
  amount: 10,
  valueLimitCents: null,
  usageLimit: 100,
  validFrom: "2026-01-01",
  validTo: "2026-12-31",
  restrictHours: false,
  hourStart: "",
  hourEnd: "",
  restrictWeekday: false,
  weekday: null,
  weekdayValueLimitCents: null,
  weekdayUsageLimit: null,
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
  birthday: false,
  firstPurchase: true,
  createdAt: "2026-03-01T10:00:00.000Z",
};

const seca15: Coupon = {
  ...lava10,
  id: "cup-2",
  code: "SECA15",
  storeId: "loja-algarve",
  storeName: "Algarve",
  storeRole: "FRANQUEADO",
  allFranchiseStores: false,
  percent: false,
  amount: 500,
  usageLimit: null,
  validFrom: "",
  validTo: "",
  firstPurchase: false,
};

let items: Coupon[];

function json(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

beforeEach(() => {
  items = [lava10, seca15];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const parsed = new URL(url, "http://local.test");
    const method = init?.method ?? "GET";
    if (parsed.pathname === "/api/stores") {
      return json([
        { id: "loja-maranguape-1", name: "Maranguape 1", code: "10000001", address: "", role: "FRANQUIA", active: true },
        { id: "loja-algarve", name: "Algarve", code: "10000003", address: "", role: "FRANQUEADO", active: true },
      ]);
    }
    if (parsed.pathname === "/api/coupons/next-code") return json({ code: "URBAN8K2" });
    if (parsed.pathname === "/api/customers") return json({ items: [], total: 0 });
    if (parsed.pathname === "/api/coupons" && method === "POST") {
      const body = JSON.parse(String(init?.body));
      const created: Coupon = { ...lava10, id: "cup-new", code: body.code, storeId: body.storeId, percent: body.percent, amount: body.amount };
      items.push(created);
      return json(created, 201);
    }
    if (parsed.pathname === "/api/coupons/cup-1" && method === "PATCH") {
      const body = JSON.parse(String(init?.body));
      lava10.amount = body.amount;
      lava10.percent = body.percent;
      return json(lava10);
    }
    if (parsed.pathname === "/api/coupons/cup-1" && method === "DELETE") return json({}, 204);
    if (parsed.pathname === "/api/coupons/cup-1") return json(lava10);
    if (parsed.pathname === "/api/coupons/cup-new") return json(items.find((c) => c.id === "cup-new") ?? lava10);
    if (parsed.pathname === "/api/coupons") {
      const storeId = parsed.searchParams.get("storeId") ?? "";
      const code = (parsed.searchParams.get("code") ?? "").toUpperCase();
      const filtered = items.filter((c) =>
        (!storeId || c.storeId === storeId || (c.allFranchiseStores && storeId === "loja-maranguape-1")) &&
        (!code || c.code.includes(code)),
      );
      return json({ items: filtered, total: filtered.length });
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

async function searchStore(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole("tab", { name: name === "Algarve" ? /Franqueados/ : /Franquia/ }));
  await user.click(await screen.findByLabelText("Unidade"));
  await user.click(await screen.findByRole("option", { name }));
  await user.click(screen.getByRole("button", { name: "Pesquisar" }));
}

describe("página Cupons", () => {
  it("só lista depois de escolher a lavanderia e pesquisar", async () => {
    renderApp("/cupons", { token: "dev-admin-token" });
    expect(await screen.findByText("Selecione uma lavanderia")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pesquisar" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Excel" })).toHaveProperty("disabled", true);
    expect(screen.queryByText("LAVA10")).toBeNull();
  });

  it("não mostra a tab Todos e separa franquia e franqueados", async () => {
    const user = userEvent.setup();
    renderApp("/cupons", { token: "dev-admin-token" });
    expect(await screen.findByRole("tab", { name: /Franquia/, selected: true })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /Todos/ })).toBeNull();
    await user.click(screen.getByLabelText("Unidade"));
    expect(await screen.findByRole("option", { name: "Maranguape 1" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Algarve" })).toBeNull();
  });

  it("mostra colunas, status e abre os detalhes", async () => {
    const user = userEvent.setup();
    renderApp("/cupons", { token: "dev-admin-token" });
    expect(await screen.findByRole("heading", { name: "Cupons" })).toBeTruthy();
    await searchStore(user, "Maranguape 1");
    expect(await screen.findByText("LAVA10")).toBeTruthy();
    expect(screen.getByText("10%")).toBeTruthy();
    expect(screen.getByText("Todas da franquia")).toBeTruthy();
    expect(screen.getByText("ATIVO")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Detalhes de LAVA10" }));
    expect(await screen.findByRole("heading", { name: "LAVA10" })).toBeTruthy();
    expect(screen.getByLabelText("Código")).toHaveProperty("value", "LAVA10");
    expect(screen.getByLabelText("Primeira compra")).toHaveProperty("checked", true);
  });

  it("cadastra um cupom pelo formulário", async () => {
    const user = userEvent.setup();
    renderApp("/cupons", { token: "dev-admin-token" });
    await user.click(await screen.findByRole("button", { name: "Novo cupom" }));
    expect(await screen.findByRole("heading", { name: "Novo cupom" })).toBeTruthy();
    expect(await screen.findByDisplayValue("URBAN8K2")).toBeTruthy();
    await user.click(screen.getByRole("combobox", { name: (_, el) => el.getAttribute("aria-label") === "Lavanderia" }));
    await user.click(await screen.findByRole("option", { name: "Maranguape 1" }));
    await user.click(screen.getByRole("checkbox", { name: "Percentual" }));
    await user.type(screen.getByRole("textbox", { name: "Percentual" }), "15");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("heading", { name: "URBAN8K2" })).toBeTruthy();
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith("/api/coupons") && c[1]?.method === "POST")).toBe(true);
  });

  it("esconde o cadastro para o franqueado", async () => {
    renderApp("/cupons", { token: "session-token", role: "FRANQUEADO", email: "loja@urban.test" });
    expect(await screen.findByRole("heading", { name: "Cupons" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Novo cupom" })).toBeNull();
  });

  it("filtra por código nas opções extras e envia a data de cadastro", async () => {
    items.push({ ...lava10, id: "cup-3", code: "PROMO99", allFranchiseStores: false, amount: 20 });
    const user = userEvent.setup();
    renderApp("/cupons", { token: "dev-admin-token" });
    await searchStore(user, "Maranguape 1");
    await screen.findByText("PROMO99");
    await user.click(screen.getByRole("button", { name: /Mais opções/ }));
    await user.type(screen.getByRole("textbox", { name: "Filtrar por código" }), "lava");
    await user.click(screen.getByRole("button", { name: "Pesquisar" }));
    await waitFor(() => expect(screen.queryByText("PROMO99")).toBeNull());
    expect(screen.getByText("LAVA10")).toBeTruthy();
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => {
      const url = String(c[0]);
      return url.includes("/api/coupons") && url.includes("code=lava") && url.includes("from=") && url.includes("to=");
    })).toBe(true);
  });

  it("exporta a planilha com os cupons", async () => {
    const user = userEvent.setup();
    const click = vi.fn();
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:cupons");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = click;
    renderApp("/cupons", { token: "dev-admin-token" });
    await searchStore(user, "Maranguape 1");
    await screen.findByText("LAVA10");
    await user.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(create).toHaveBeenCalled();
    HTMLAnchorElement.prototype.click = orig;
    create.mockRestore();
    revoke.mockRestore();
  });
});

describe("edição de cupom", () => {
  it("abre a edição a partir dos detalhes", async () => {
    const user = userEvent.setup();
    renderApp("/cupons/cup-1", { token: "dev-admin-token" });
    await user.click(await screen.findByRole("button", { name: "Editar" }));
    expect(await screen.findByRole("heading", { name: "Editar cupom" })).toBeTruthy();
    expect(screen.getByLabelText("Código")).toHaveProperty("value", "LAVA10");
  });
});

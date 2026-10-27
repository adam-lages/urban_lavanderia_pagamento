import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NAV_ITEMS } from "./nav";
import { emptyOverview } from "./test/overview";
import { renderApp } from "./test/render";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => (String(input).includes("/dashboard/overview") ? emptyOverview : []),
    }),
  ));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("navegação do dashboard", () => {
  it("pede o token quando não autenticado", () => {
    renderApp("/");
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Token de administrador")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Menu principal" })).toBeNull();
  });

  it("mostra o menu lateral após o login", async () => {
    const user = userEvent.setup();
    renderApp("/login");
    await user.type(screen.getByPlaceholderText("Token de administrador"), "dev-admin-token");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    const nav = screen.getByRole("navigation", { name: "Menu principal" });
    for (const item of NAV_ITEMS) expect(nav.textContent).toContain(item.label);
    expect(screen.getByRole("heading", { name: "Início" })).toBeTruthy();
    expect(await screen.findByText(/Escolha a unidade/)).toBeTruthy();
  });

  it("abre as páginas placeholder pelo menu", async () => {
    const user = userEvent.setup();
    renderApp("/", { token: "dev-admin-token" });
    await user.click(screen.getByRole("link", { name: "Clientes" }));
    expect(screen.getByRole("heading", { name: "Listagem de clientes" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Vendas" }));
    expect(screen.getByRole("heading", { name: "Listagem de vendas" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Lavanderias" }));
    expect(screen.getByRole("heading", { name: "Lavanderias" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Cupons" }));
    expect(screen.getByRole("heading", { name: "Cupons" })).toBeTruthy();
  });
});

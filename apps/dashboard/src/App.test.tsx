import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NAV_ITEMS, visibleNavItems } from "./nav";
import { emptyOverview } from "./test/overview";
import { renderApp } from "./test/render";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/auth/login")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as { email?: string };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          token: "session-token",
          user: { id: "u1", email: body.email, role: "FRANQUIA" },
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => (url.includes("/dashboard/overview") ? emptyOverview : []),
    });
  }));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("navegação do dashboard", () => {
  it("pede e-mail e senha quando não autenticado", () => {
    renderApp("/");
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy();
    expect(screen.getByPlaceholderText("E-mail")).toBeTruthy();
    expect(screen.getByPlaceholderText("Senha")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Menu principal" })).toBeNull();
  });

  it("mostra o menu lateral após o login", async () => {
    const user = userEvent.setup();
    renderApp("/login");
    await user.type(screen.getByPlaceholderText("E-mail"), "adamflages@gmail.com");
    await user.type(screen.getByPlaceholderText("Senha"), "@Hoje123@");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    const nav = await screen.findByRole("navigation", { name: "Menu principal" });
    for (const item of NAV_ITEMS) expect(nav.textContent).toContain(item.label);
    expect(screen.getByRole("heading", { name: "Início" })).toBeTruthy();
    expect(await screen.findByText(/Escolha a unidade/)).toBeTruthy();
  });

  it("abre as páginas placeholder pelo menu", async () => {
    const user = userEvent.setup();
    renderApp("/", { token: "dev-admin-token" });
    await user.click(screen.getByRole("link", { name: "Clientes" }));
    expect(screen.getByRole("heading", { name: "Clientes" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Vendas" }));
    expect(screen.getByRole("heading", { name: "Vendas" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Lavanderias" }));
    expect(screen.getByRole("heading", { name: "Lavanderias" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Cupons" }));
    expect(screen.getByRole("heading", { name: "Cupons" })).toBeTruthy();
  });

  it("esconde Gestão para o franqueado", async () => {
    renderApp("/", { token: "session-token", role: "FRANQUEADO", email: "loja@urban.test" });
    const nav = screen.getByRole("navigation", { name: "Menu principal" });
    expect(nav.textContent).not.toContain("Gestão");
    expect(nav.textContent).not.toContain("Lavanderias");
    expect(nav.textContent).not.toContain("Máquinas");
    for (const item of visibleNavItems("FRANQUEADO")) expect(nav.textContent).toContain(item.label);
  });

  it("recusa a rota de lavanderias para o franqueado", () => {
    renderApp("/lavanderias", { token: "session-token", role: "FRANQUEADO" });
    expect(screen.queryByRole("heading", { name: "Lavanderias" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Início" })).toBeTruthy();
  });
});

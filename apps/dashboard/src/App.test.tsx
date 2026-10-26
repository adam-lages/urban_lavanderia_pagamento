import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { NAV_ITEMS } from "./nav";
import { renderApp } from "./test/render";

afterEach(() => {
  cleanup();
  localStorage.clear();
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
    expect(screen.getByText("Em breve.")).toBeTruthy();
  });

  it("abre as páginas placeholder pelo menu", async () => {
    const user = userEvent.setup();
    renderApp("/", { token: "dev-admin-token" });
    await user.click(screen.getByRole("link", { name: "Listagem de clientes" }));
    expect(screen.getByRole("heading", { name: "Listagem de clientes" })).toBeTruthy();
    expect(screen.getByText("Em breve.")).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Listagem de vendas" }));
    expect(screen.getByRole("heading", { name: "Listagem de vendas" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Minhas Lavanderias" }));
    expect(screen.getByRole("heading", { name: "Minhas Lavanderias" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Cupons" }));
    expect(screen.getByRole("heading", { name: "Cupons" })).toBeTruthy();
  });
});

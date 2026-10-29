import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyOverview } from "../test/overview";
import { renderApp } from "../test/render";
import { THEME_STORAGE_KEY } from "../theme";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => Promise.resolve({
    ok: true,
    status: 200,
    json: async () => (String(input).includes("/dashboard/overview") ? emptyOverview : []),
  })));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

const bodyBackground = () => getComputedStyle(document.body).backgroundColor;

describe("tema do painel", () => {
  it("começa em Light e troca para Dark salvando no navegador", async () => {
    const user = userEvent.setup();
    renderApp("/", { token: "dev-admin-token" });
    const light = bodyBackground();
    await user.click(screen.getByRole("button", { name: "Trocar tema" }));
    expect(screen.getByRole("menuitem", { name: "Light" }).className).toContain("Mui-selected");
    await user.click(screen.getByRole("menuitem", { name: "Dark" }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(bodyBackground()).not.toBe(light);
  });

  it("abre com o tema salvo", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const user = userEvent.setup();
    renderApp("/", { token: "dev-admin-token" });
    await user.click(screen.getByRole("button", { name: "Trocar tema" }));
    expect(screen.getByRole("menuitem", { name: "Dark" }).className).toContain("Mui-selected");
  });
});

import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyOverview } from "../test/overview";
import { renderApp } from "../test/render";

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

const urbanSrcs = () => screen.getAllByRole("img", { name: "Urban" }).map((img) => img.getAttribute("src") ?? "");

describe("marca Urban", () => {
  it("usa a logo clara no tema light e a branca no tema dark", async () => {
    const user = userEvent.setup();
    renderApp("/", { token: "dev-admin-token" });
    expect(urbanSrcs().length).toBeGreaterThan(0);
    expect(urbanSrcs().every((src) => src.includes("logo-urban-light"))).toBe(true);

    await user.click(screen.getByRole("button", { name: "Trocar tema" }));
    await user.click(screen.getByRole("menuitem", { name: "Dark" }));
    expect(urbanSrcs().every((src) => src.includes("logo-urban-dark"))).toBe(true);
  });

  it("mostra a marca na tela de login", () => {
    renderApp("/login");
    expect(screen.getByRole("img", { name: "Urban" })).toBeTruthy();
  });
});

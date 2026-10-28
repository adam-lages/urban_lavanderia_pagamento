import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MachinePricing, Store } from "../../api";
import { renderApp } from "../../test/render";

const centro: Store = { id: "s1", name: "Centro", legalName: "", code: "10000010", address: "", cnpj: "11222333000181", role: "FRANQUIA", active: true };
const washer: MachinePricing = { machineId: "m1", label: "Lavadora 1", code: "100001", kind: "WASHER", cycleMinutes: 30, priceCents: 1590, schedules: [] };
const dryer: MachinePricing = {
  machineId: "m2",
  label: "Secadora 1",
  code: "100002",
  kind: "DRYER",
  cycleMinutes: 45,
  priceCents: 1590,
  schedules: [{ startTime: "08:00", endTime: "12:00", amountCents: 1490, weekdays: [2, 3] }],
};

let saved: unknown;

function json(data: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => data });
}

beforeEach(() => {
  saved = null;
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const { pathname } = new URL(String(input), "http://local.test");
    if (pathname === "/api/stores/s1") return json(centro);
    if (pathname === "/api/stores") return json([centro]);
    if (pathname === "/api/stores/s1/pricing") return json([washer, dryer]);
    if (pathname === "/api/machines/m1/pricing" && init?.method === "PUT") {
      saved = JSON.parse(String(init.body));
      return json({ ...washer, ...(saved as object) });
    }
    return json({ message: `não mockado ${pathname}` }, 404);
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("tab Preços", () => {
  it("lista o preço por máquina e mostra as programações ao expandir", async () => {
    const user = userEvent.setup();
    renderApp("/lavanderias/s1?tab=precos", { token: "dev-admin-token" });
    expect(await screen.findByText("Lavadora 1")).toBeTruthy();
    expect(screen.getByText("Lavagem")).toBeTruthy();
    expect(screen.getByText("45 min")).toBeTruthy();
    expect(screen.getByText("Sem promoção")).toBeTruthy();
    expect(screen.getByText("1 programação")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Expandir Secadora 1" }));
    expect(await screen.findByText("TER, QUA")).toBeTruthy();
    expect(screen.getByText("08:00 às 12:00")).toBeTruthy();
  });

  it("edita o valor padrão e adiciona uma programação especial", async () => {
    const user = userEvent.setup();
    renderApp("/lavanderias/s1?tab=precos", { token: "dev-admin-token" });
    await user.click(await screen.findByRole("button", { name: "Editar preço de Lavadora 1" }));
    expect(screen.getByDisplayValue("Lavagem - Lavadora 1")).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Valor padrão" }), { target: { value: "R$ 16,90" } });
    await user.click(screen.getByRole("checkbox", { name: "Com valores programados" }));
    await user.click(screen.getByRole("button", { name: "Adicionar programação especial" }));
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Hora inicial 1"), { target: { value: "06:00" } });
    fireEvent.change(screen.getByLabelText("Hora final 1"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Valor 1" }), { target: { value: "R$ 12,90" } });
    await user.click(screen.getByRole("button", { name: "SEG" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(saved).toEqual({
      priceCents: 1690,
      schedules: [{ startTime: "06:00", endTime: "09:00", amountCents: 1290, weekdays: [1] }],
    }));
    await waitFor(() => expect(screen.getAllByText("1 programação")).toHaveLength(2));
  });
});

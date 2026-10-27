import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Overview } from "../api";
import { emptyOverview } from "../test/overview";
import { renderApp } from "../test/render";
import { rangeFor } from "./home/periods";

const overview: Overview = {
  ...emptyOverview,
  cycles: 4,
  revenueCents: 6000,
  avgTicketCents: 1500,
  machines: [
    { machineId: "w1", label: "Lavadora 1", storeName: "Algarve", kind: "WASHER", cycles: 2, revenueCents: 3600 },
    { machineId: "d1", label: "Secadora 1", storeName: "Algarve", kind: "DRYER", cycles: 2, revenueCents: 2400 },
  ],
  kinds: { washers: 2, dryers: 2 },
  recurrence: {
    customers: 2,
    returning: 1,
    anonymousOrders: 1,
    buckets: [
      { label: "1 compra", customers: 1 },
      { label: "2 compras", customers: 1 },
      { label: "3 ou mais", customers: 0 },
    ],
  },
  signups: { month: "2026-10", total: 3, byDay: [{ date: "2026-10-01", count: 3, cumulative: 3 }] },
};

function json(data: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => data });
}

const calls = () => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
const overviewCalls = () => calls().filter((u) => u.includes("/dashboard/overview"));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://local.test");
    if (url.pathname === "/api/stores") {
      return json([
        { id: "loja-algarve", name: "Algarve", code: "10000003", address: "", active: true },
        { id: "loja-maranguape-1", name: "Maranguape 1", code: "10000001", address: "", active: true },
      ]);
    }
    if (url.pathname === "/api/dashboard/overview") return json(overview);
    return json([]);
  }));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("página inicial", () => {
  it("abre em Hoje, com as datas preenchidas e travadas", async () => {
    renderApp("/", { token: "dev-admin-token" });
    expect(await screen.findByText("Quantidade de ciclos")).toBeTruthy();
    const today = rangeFor("today");
    const from = screen.getByLabelText("Data inicial") as HTMLInputElement;
    const to = screen.getByLabelText("Data final") as HTMLInputElement;
    expect(from.value).toBe(today.from);
    expect(to.value).toBe(today.to);
    expect(from.disabled).toBe(true);
    expect(to.disabled).toBe(true);
    expect(overviewCalls()[0]).toContain(`from=${today.from}&to=${today.to}`);
  });

  it("mostra os indicadores e os gráficos pedidos", async () => {
    renderApp("/", { token: "dev-admin-token" });
    expect(await screen.findByText("R$ 60,00")).toBeTruthy();
    expect(screen.getByText("R$ 15,00")).toBeTruthy();
    for (const title of [
      "Quantidade de ciclos",
      "Faturamento",
      "Ticket médio",
      "Faturamento por dia",
      "Faturamento por horário do dia",
      "Vendas por semana",
      "Lavagem x secagem",
      "Faturamento por máquina de lavar",
      "Faturamento por máquina de secar",
      "Evolução de cadastro de clientes",
      "Recorrência de compras",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    }
    expect(screen.getByText("Lavadora 1 · Algarve")).toBeTruthy();
    expect(screen.getByText("Secadora 1 · Algarve")).toBeTruthy();
    expect(screen.getByText(/2 clientes no período, 1 recorrentes \(50%\)/)).toBeTruthy();
    expect(screen.getByText(/1 compras sem cliente identificado/)).toBeTruthy();
  });

  it("preenche as datas ao trocar o período e só libera em Customizado", async () => {
    const user = userEvent.setup();
    renderApp("/", { token: "dev-admin-token" });
    await screen.findByText("Quantidade de ciclos");
    await user.click(screen.getByLabelText("Período"));
    await user.click(await screen.findByRole("option", { name: "Últimos 7 dias" }));
    const week = rangeFor("last7");
    expect((screen.getByLabelText("Data inicial") as HTMLInputElement).value).toBe(week.from);
    expect((screen.getByLabelText("Data final") as HTMLInputElement).value).toBe(week.to);
    expect((screen.getByLabelText("Data inicial") as HTMLInputElement).disabled).toBe(true);
    expect(overviewCalls()).toHaveLength(1);

    await user.click(screen.getByLabelText("Período"));
    await user.click(await screen.findByRole("option", { name: "Customizado" }));
    expect((screen.getByLabelText("Data inicial") as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText("Data final") as HTMLInputElement).disabled).toBe(false);
  });

  it("pesquisa com unidade e intervalo customizado e limpa o filtro", async () => {
    const user = userEvent.setup();
    renderApp("/", { token: "dev-admin-token" });
    await screen.findByText("Quantidade de ciclos");
    await user.click(screen.getByLabelText("Unidade"));
    await user.click(await screen.findByRole("option", { name: "Algarve" }));
    await user.click(screen.getByLabelText("Período"));
    await user.click(await screen.findByRole("option", { name: "Customizado" }));
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-10-15" } });
    await user.click(screen.getByRole("button", { name: "Pesquisar" }));
    await waitFor(() => expect(overviewCalls()).toHaveLength(2));
    expect(overviewCalls()[1]).toContain("from=2026-10-01");
    expect(overviewCalls()[1]).toContain("to=2026-10-15");
    expect(overviewCalls()[1]).toContain("storeId=loja-algarve");

    await user.click(screen.getByRole("button", { name: "Limpar" }));
    await waitFor(() => expect(overviewCalls()).toHaveLength(3));
    const today = rangeFor("today");
    expect(overviewCalls()[2]).toContain(`from=${today.from}`);
    expect(overviewCalls()[2]).not.toContain("storeId");
    expect((screen.getByLabelText("Data inicial") as HTMLInputElement).disabled).toBe(true);
  });

  it("bloqueia a pesquisa quando o intervalo é inválido", async () => {
    const user = userEvent.setup();
    renderApp("/", { token: "dev-admin-token" });
    await screen.findByText("Quantidade de ciclos");
    await user.click(screen.getByLabelText("Período"));
    await user.click(await screen.findByRole("option", { name: "Customizado" }));
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-10-20" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-10-10" } });
    expect((screen.getByRole("button", { name: "Pesquisar" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

afterEach(cleanup);

function renderAt(entries: string[]) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/lavanderias" element={<PageHeader title="Lavanderias" />} />
        <Route path="/vendas" element={<PageHeader title="Vendas" />} />
        <Route
          path="/lavanderias/:id"
          element={<PageHeader title="Centro" crumbs={[{ label: "Lavanderias", to: "/lavanderias" }, { label: "Centro" }]} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("botão voltar do cabeçalho", () => {
  it("não aparece nas páginas do menu", () => {
    renderAt(["/lavanderias"]);
    expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
  });

  it("volta para a página que abriu a tela", async () => {
    const user = userEvent.setup();
    renderAt(["/vendas", "/lavanderias/s1"]);
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(await screen.findByRole("heading", { name: "Vendas" })).toBeTruthy();
  });

  it("sem histórico, volta para a trilha de navegação", async () => {
    const user = userEvent.setup();
    renderAt(["/lavanderias/s1"]);
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(await screen.findByRole("heading", { name: "Lavanderias" })).toBeTruthy();
  });
});

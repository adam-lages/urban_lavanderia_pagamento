import { describe, expect, it } from "vitest";
import { RECEIPT_WIDTH, wrap } from "./receipt";

describe("quebra de linha do comprovante", () => {
  it("quebra o endereço por palavras sem passar da largura", () => {
    const lines = wrap("Av. Dr. Cláudio José Gueiros Leite, 100 — Maranguape I, Paulista - PE");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((l) => l.length <= RECEIPT_WIDTH)).toBe(true);
    expect(lines.join(" ")).toBe("Av. Dr. Cláudio José Gueiros Leite, 100 — Maranguape I, Paulista - PE");
  });

  it("não gera linhas para texto vazio", () => {
    expect(wrap("")).toEqual([]);
  });
});

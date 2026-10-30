import { describe, expect, it } from "vitest";
import { formatCpf, formatPhone, maskCpf, maskPhone } from "./format";

describe("máscaras de CPF e telefone", () => {
  it("formata CPF completo", () => {
    expect(formatCpf("10031439462")).toBe("100.314.394-62");
    expect(maskCpf("10031439462")).toBe("100.314.394-62");
  });

  it("aplica a máscara de CPF enquanto digita", () => {
    expect(maskCpf("100")).toBe("100");
    expect(maskCpf("100314")).toBe("100.314");
    expect(maskCpf("100314394")).toBe("100.314.394");
    expect(maskCpf("100.314.394-62")).toBe("100.314.394-62");
  });

  it("formata celular com DDD", () => {
    expect(formatPhone("81979044196")).toBe("(81) 97904-4196");
    expect(formatPhone("5581979044196")).toBe("(81) 97904-4196");
    expect(maskPhone("81979044196")).toBe("(81) 97904-4196");
  });

  it("aplica a máscara de telefone enquanto digita", () => {
    expect(maskPhone("81")).toBe("(81");
    expect(maskPhone("8197904")).toBe("(81) 97904");
    expect(maskPhone("(81) 97904-4196")).toBe("(81) 97904-4196");
  });
});

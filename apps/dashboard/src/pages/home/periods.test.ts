import { describe, expect, it } from "vitest";
import { rangeFor } from "./periods";

const now = new Date(2026, 9, 27, 15, 0);

describe("períodos do filtro", () => {
  it("calcula cada opção a partir de hoje", () => {
    expect(rangeFor("today", now)).toEqual({ from: "2026-10-27", to: "2026-10-27" });
    expect(rangeFor("yesterday", now)).toEqual({ from: "2026-10-26", to: "2026-10-26" });
    expect(rangeFor("last3", now)).toEqual({ from: "2026-10-25", to: "2026-10-27" });
    expect(rangeFor("last7", now)).toEqual({ from: "2026-10-21", to: "2026-10-27" });
    expect(rangeFor("last30", now)).toEqual({ from: "2026-09-28", to: "2026-10-27" });
    expect(rangeFor("month", now)).toEqual({ from: "2026-10-01", to: "2026-10-27" });
    expect(rangeFor("lastMonth", now)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });

  it("vira o ano ao pedir o último mês em janeiro", () => {
    expect(rangeFor("lastMonth", new Date(2026, 0, 10))).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
});

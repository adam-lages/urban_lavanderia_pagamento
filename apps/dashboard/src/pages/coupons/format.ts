import { brl, WEEKDAYS, type Coupon, type Kind } from "../../api";

export function discountLabel(c: Pick<Coupon, "percent" | "amount">) {
  return c.percent ? `${c.amount}%` : brl(c.amount);
}

export function periodLabel(from: string, to: string) {
  if (!from && !to) return "Sem prazo";
  const fmt = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-");
    return y && m && d ? `${d}/${m}/${y}` : iso;
  };
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  return from ? `A partir de ${fmt(from)}` : `Até ${fmt(to)}`;
}

export function couponStatus(c: Pick<Coupon, "validFrom" | "validTo">, today = new Date().toISOString().slice(0, 10)) {
  if (c.validTo && c.validTo < today) return "EXPIRADO" as const;
  if (c.validFrom && c.validFrom > today) return "PROGRAMADO" as const;
  return "ATIVO" as const;
}

export function weekdayLabel(day: number | null) {
  if (day === null || day === undefined) return "—";
  return WEEKDAYS[day] ?? "—";
}

export function serviceLabel(service: Kind | "") {
  if (service === "WASHER") return "Lavagem";
  if (service === "DRYER") return "Secagem";
  return "—";
}

export function storeScope(c: Pick<Coupon, "allFranchiseStores" | "storeName">) {
  return c.allFranchiseStores ? "Todas da franquia" : c.storeName;
}

export function couponsSheet(items: Coupon[]) {
  const header = ["Código", "Desconto", "Lavanderia", "Validade", "Limite de uso", "Status"];
  const rows = items.map((c) => [
    c.code,
    discountLabel(c),
    storeScope(c),
    periodLabel(c.validFrom, c.validTo),
    c.usageLimit == null ? "Ilimitado" : String(c.usageLimit),
    couponStatus(c),
  ]);
  return { header, rows };
}

export function couponsCsv(items: Coupon[]) {
  const { header, rows } = couponsSheet(items);
  return [header.join(";"), ...rows.map((cols) => cols.map((v) => `"${v.replaceAll('"', '""')}"`).join(";"))].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

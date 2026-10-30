import { VOUCHER_CATEGORIES, brl, type Voucher } from "../../api";
import { periodLabel } from "../coupons/format";

export function categoryLabel(value: string) {
  return VOUCHER_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function voucherStatus(v: Pick<Voucher, "validFrom" | "validTo" | "balanceCents">, today = new Date().toISOString().slice(0, 10)) {
  if (v.balanceCents <= 0) return "SEM SALDO" as const;
  if (v.validTo && v.validTo < today) return "EXPIRADO" as const;
  if (v.validFrom && v.validFrom > today) return "PROGRAMADO" as const;
  return "ATIVO" as const;
}

export function vouchersSheet(items: Voucher[]) {
  const header = ["Código", "Categoria", "Lavanderia", "Valor", "Saldo", "Validade", "Status"];
  const rows = items.map((v) => [
    v.code,
    categoryLabel(v.category),
    v.storeName,
    brl(v.amountCents),
    brl(v.balanceCents),
    periodLabel(v.validFrom, v.validTo),
    voucherStatus(v),
  ]);
  return { header, rows };
}

export function vouchersCsv(items: Voucher[]) {
  const { header, rows } = vouchersSheet(items);
  return [header.join(";"), ...rows.map((cols) => cols.map((c) => `"${c.replaceAll('"', '""')}"`).join(";"))].join("\n");
}

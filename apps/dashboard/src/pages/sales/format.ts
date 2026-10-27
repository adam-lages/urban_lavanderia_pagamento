import type { PayMethod } from "../../api";

const METHOD: Record<PayMethod, string> = {
  CREDIT: "Crédito",
  DEBIT: "Débito",
  PIX: "PIX",
  VOUCHER: "Voucher",
};

export function paymentMethodLabel(method: PayMethod | null) {
  return method ? METHOD[method] : "—";
}

export function dash(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

export function formatPaidAt(iso: string) {
  if (!iso) return { date: "—", time: "" };
  const when = new Date(iso);
  return {
    date: when.toLocaleDateString("pt-BR"),
    time: when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

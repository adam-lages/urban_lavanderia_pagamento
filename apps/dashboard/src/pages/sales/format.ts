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

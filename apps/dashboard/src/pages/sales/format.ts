import { brl, type PayMethod, type Sale } from "../../api";
import { downloadExcel } from "../../excel";
import { formatCpf } from "../clients/format";

export { downloadExcel };

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

export function salesSheet(items: Sale[]) {
  const header = ["Cliente", "CPF", "Data da compra", "Hora", "Máquina", "Qtd. serviços", "Valor pago", "Método", "Cupom"];
  const rows = items.map((s) => {
    const when = formatPaidAt(s.paidAt);
    return [
      dash(s.customerName),
      s.customerCpf ? formatCpf(s.customerCpf) : "—",
      when.date,
      when.time,
      s.machineLabel,
      String(s.servicesCount),
      brl(s.paidCents),
      paymentMethodLabel(s.paymentMethod),
      dash(s.couponCode),
    ];
  });
  return { header, rows };
}

import { brl, type Sale, type Store } from "../../api";
import { formatCpf } from "../clients/format";
import { formatCnpj } from "../stores/format";
import { formatPaidAt, paymentMethodLabel } from "./format";

export const RECEIPT_WIDTH = 40;
const RULE = "-".repeat(RECEIPT_WIDTH);

const center = (text: string) => {
  const pad = Math.max(0, Math.floor((RECEIPT_WIDTH - text.length) / 2));
  return " ".repeat(pad) + text;
};

const spread = (left: string, right: string) => {
  const gap = RECEIPT_WIDTH - left.length - right.length;
  return gap >= 1 ? left + " ".repeat(gap) + right : `${left}\n${" ".repeat(Math.max(0, RECEIPT_WIDTH - right.length))}${right}`;
};

export function wrap(text: string, width = RECEIPT_WIDTH) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/)) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
    while (line.length > width) {
      lines.push(line.slice(0, width));
      line = line.slice(width);
    }
  }
  if (line) lines.push(line);
  return lines;
}

export const serviceLabel = (s: Pick<Sale, "machineKind">) => (s.machineKind === "DRYER" ? "Secar" : "Lavar");

export function receiptLines(store: Store, items: Sale[]) {
  const first = items[0];
  const when = formatPaidAt(first.paidAt);
  const total = first.paidCents;
  const lines = [
    ...wrap(store.name).map(center),
    center(`CNPJ: ${formatCnpj(store.cnpj)}`),
    ...wrap(store.address).map(center),
    spread("Data e hora", `${when.time} ${when.date}`),
    "",
    RULE,
    spread("Cliente:", first.customerName || "Não identificado"),
    spread("CPF:", first.customerCpf ? formatCpf(first.customerCpf) : "—"),
    RULE,
    spread("#  Serviço", "R$"),
    RULE,
    ...items.map((i, n) => spread(`${n + 1}  ${serviceLabel(i)} - ${i.machineLabel}`, brl(i.amountCents))),
    RULE,
    spread("Pagamento:", paymentMethodLabel(first.paymentMethod)),
  ];
  if (first.cardBrand) lines.push(spread("Bandeira:", first.cardBrand));
  if (first.cardNumber) lines.push(spread("Cartão:", first.cardNumber));
  if (first.authCode) lines.push(spread("AUT:", first.authCode));
  if (first.couponCode) lines.push(spread("Desconto:", `Cupom ${first.couponCode}`));
  if (first.voucherCode) lines.push(spread("Voucher:", first.voucherCode));
  lines.push(spread("Total:", brl(total)));
  return lines;
}

export function downloadReceipt(filename: string, lines: string[]) {
  const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

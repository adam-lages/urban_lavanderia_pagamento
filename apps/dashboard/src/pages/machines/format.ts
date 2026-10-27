import type { Board, Command } from "../../api";
import type { LabelColor } from "../../components/Label";

export interface CommandDetail extends Command {
  events: Array<{ type: string; detail: string | null; createdAt: string }>;
}

export const FINAL_STATES = ["DONE", "UNCONFIRMED", "FAILED", "EXPIRED"];

const STATE_LABEL: Record<string, string> = {
  PENDING: "Enviando…",
  SENT: "Enviado (aguardando confirmação)",
  DONE: "Confirmado",
  UNCONFIRMED: "Não confirmado",
  FAILED: "Recusado pela placa",
  EXPIRED: "Expirado",
};

export const stateLabel = (status: string) => STATE_LABEL[status] ?? status;

export function stateColor(status: string): LabelColor {
  if (status === "DONE") return "success";
  if (status === "SENT" || status === "PENDING") return "warning";
  if (FINAL_STATES.includes(status)) return "error";
  return "default";
}

export function displayName(b: Board) {
  if (b.registered || b.name) return b.name ?? "—";
  return "Nova placa";
}

export const formatDateTime = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");

export function formatDateParts(s: string | null) {
  if (!s) return { date: "—", time: "" };
  const d = new Date(s);
  return {
    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

import { WEEKDAYS, type Kind } from "../../../api";

export const kindService = (k: Kind) => (k === "DRYER" ? "Secagem" : "Lavagem");

export function weekdaysLabel(days: number[]) {
  if (days.length === 7) return "Todos os dias";
  return days.map((d) => WEEKDAYS[d]).join(", ");
}

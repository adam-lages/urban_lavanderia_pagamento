export type PeriodPreset = "today" | "yesterday" | "last3" | "last7" | "last30" | "month" | "lastMonth" | "custom";

export const PERIOD_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last3", label: "Últimos 3 dias" },
  { value: "last7", label: "Últimos 7 dias" },
  { value: "last30", label: "Últimos 30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "lastMonth", label: "Último mês" },
  { value: "custom", label: "Customizado" },
];

export interface DateRange {
  from: string;
  to: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toDay(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shift(base: Date, days: number) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

export function rangeFor(preset: Exclude<PeriodPreset, "custom">, now = new Date()): DateRange {
  const today = toDay(now);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const day = toDay(shift(now, -1));
      return { from: day, to: day };
    }
    case "last3":
      return { from: toDay(shift(now, -2)), to: today };
    case "last7":
      return { from: toDay(shift(now, -6)), to: today };
    case "last30":
      return { from: toDay(shift(now, -29)), to: today };
    case "month":
      return { from: toDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case "lastMonth":
      return {
        from: toDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
  }
}

export function formatDayShort(day: string) {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
}

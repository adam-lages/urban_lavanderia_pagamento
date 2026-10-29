const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function formatDuration(ms: number) {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export const uptimePercent = (onlineMs: number, offlineMs: number) =>
  onlineMs + offlineMs ? Math.round((onlineMs / (onlineMs + offlineMs)) * 1000) / 10 : 0;

export function timeTicks(from: number, to: number) {
  const step = to - from > 2 * DAY ? DAY : 3 * HOUR;
  const ticks: number[] = [];
  const first = new Date(from);
  first.setMinutes(0, 0, 0);
  if (step === DAY) first.setHours(0);
  else first.setHours(Math.ceil(first.getHours() / 3) * 3);
  for (let t = first.getTime(); t <= to; t += step) if (t >= from) ticks.push(t);
  return { ticks, daily: step === DAY };
}

const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export const tickLabel = (t: number, daily: boolean) => {
  const d = new Date(t);
  return daily || (d.getHours() === 0 && d.getMinutes() === 0) ? day.format(d).replace(".", "") : time.format(d);
};

export const moment = (iso: string) => `${day.format(new Date(iso)).replace(".", "")} ${time.format(new Date(iso))}`;

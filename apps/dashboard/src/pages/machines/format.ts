export function formatDateParts(s: string | null) {
  if (!s) return { date: "—", time: "" };
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

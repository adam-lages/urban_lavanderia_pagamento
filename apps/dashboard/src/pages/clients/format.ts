import type { Customer } from "../../api";

export function formatCpf(cpf: string) {
  const d = cpf.replace(/\D/g, "").padStart(11, "0").slice(-11);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  const local = d.startsWith("55") ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return phone;
}

export function whatsappUrl(phone: string) {
  const d = phone.replace(/\D/g, "");
  const withCountry = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${withCountry}`;
}

export function formatBirth(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatCreated(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("pt-BR"),
    time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export function customersCsv(items: Customer[]) {
  const header = ["Nome", "Dt Nascimento", "Idade", "CPF", "Email", "Celular", "Data Cadastro", "Status"];
  const lines = items.map((c) => {
    const created = formatCreated(c.createdAt);
    const cols = [
      c.name,
      formatBirth(c.birthDate),
      String(c.age),
      formatCpf(c.cpf),
      c.email,
      formatPhone(c.phone),
      `${created.date} ${created.time}`,
      c.blocked ? "BLOQUEADO" : "ATIVO",
    ];
    return cols.map((v) => `"${v.replaceAll('"', '""')}"`).join(";");
  });
  return [header.join(";"), ...lines].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

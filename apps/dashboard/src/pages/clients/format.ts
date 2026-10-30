import type { Customer } from "../../api";

export function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function maskCpf(value: string) {
  const d = digits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatCpf(cpf: string) {
  const d = digits(cpf);
  if (!d) return "";
  return maskCpf(d.padStart(11, "0").slice(-11));
}

export function maskPhone(value: string) {
  let d = digits(value);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatPhone(phone: string) {
  const d = digits(phone);
  const local = d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
  if (local.length === 11) return maskPhone(local);
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return phone;
}

export function customersSheet(items: Customer[]) {
  const header = ["Unidade", "Nome", "Dt Nascimento", "Idade", "CPF", "Email", "Celular", "Data Cadastro", "Status"];
  const rows = items.map((c) => {
    const created = formatCreated(c.createdAt);
    return [
      c.storeName,
      c.name,
      formatBirth(c.birthDate),
      String(c.age),
      formatCpf(c.cpf),
      c.email,
      formatPhone(c.phone),
      `${created.date} ${created.time}`,
      c.blocked ? "BLOQUEADO" : "ATIVO",
    ];
  });
  return { header, rows };
}

export function whatsappUrl(phone: string) {
  const d = digits(phone);
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

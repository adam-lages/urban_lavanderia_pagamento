import type { Role } from "./api";

export const NAV_SECTIONS = ["Geral", "Listagem", "Gestão", "Promoção"] as const;

export const NAV_ITEMS = [
  { to: "/", label: "Início", section: "Geral" },
  { to: "/vendas", label: "Vendas", section: "Listagem" },
  { to: "/clientes", label: "Clientes", section: "Listagem" },
  { to: "/lavanderias", label: "Lavanderias", section: "Gestão" },
  { to: "/cupons", label: "Cupons", section: "Promoção" },
] as const;

export function canSeeSection(section: (typeof NAV_SECTIONS)[number], role: Role) {
  return section !== "Gestão" || role === "FRANQUIA";
}

export function visibleNavItems(role: Role) {
  return NAV_ITEMS.filter((item) => canSeeSection(item.section, role));
}

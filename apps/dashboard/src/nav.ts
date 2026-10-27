export const NAV_SECTIONS = ["Geral", "Listagem", "Gestão", "Promoção"] as const;

export const NAV_ITEMS = [
  { to: "/", label: "Início", section: "Geral" },
  { to: "/vendas", label: "Vendas", section: "Listagem" },
  { to: "/clientes", label: "Clientes", section: "Listagem" },
  { to: "/lavanderias", label: "Lavanderias", section: "Gestão" },
  { to: "/maquinas", label: "Máquinas", section: "Gestão" },
  { to: "/cupons", label: "Cupons", section: "Promoção" },
] as const;

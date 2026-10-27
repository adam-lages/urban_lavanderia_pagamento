export const NAV_SECTIONS = ["Visão geral", "Gestão"] as const;

export const NAV_ITEMS = [
  { to: "/", label: "Início", section: "Visão geral" },
  { to: "/vendas", label: "Listagem de vendas", section: "Visão geral" },
  { to: "/clientes", label: "Listagem de clientes", section: "Gestão" },
  { to: "/lavanderias", label: "Minhas Lavanderias", section: "Gestão" },
  { to: "/maquinas", label: "Máquinas", section: "Gestão" },
  { to: "/cupons", label: "Cupons", section: "Gestão" },
] as const;

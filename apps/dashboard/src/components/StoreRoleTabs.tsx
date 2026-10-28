import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { alpha } from "@mui/material/styles";
import type { Role, Store } from "../api";
import { Label, type LabelColor } from "./Label";

export type StoreFilter = "all" | Role;

const TABS: Array<{ value: StoreFilter; label: string; color: LabelColor }> = [
  { value: "all", label: "Todos", color: "default" },
  { value: "FRANQUIA", label: "Franquia", color: "info" },
  { value: "FRANQUEADO", label: "Franqueados", color: "warning" },
];

export function countByRole(stores: Store[]): Record<StoreFilter, number> {
  return {
    all: stores.length,
    FRANQUIA: stores.filter((s) => s.role === "FRANQUIA").length,
    FRANQUEADO: stores.filter((s) => s.role === "FRANQUEADO").length,
  };
}

export function storesOfRole(stores: Store[], filter: StoreFilter) {
  return filter === "all" ? stores : stores.filter((s) => s.role === filter);
}

export function StoreRoleTabs({ value, counts, onChange, withAll = true }: {
  value: StoreFilter;
  counts: Record<StoreFilter, number>;
  onChange: (f: StoreFilter) => void;
  withAll?: boolean;
}) {
  const tabs = withAll ? TABS : TABS.filter((t) => t.value !== "all");
  return (
    <Tabs
      value={value}
      onChange={(_, v: StoreFilter) => onChange(v)}
      sx={(t) => ({ px: 2.5, boxShadow: `inset 0 -2px 0 0 ${alpha(t.palette.grey[500], 0.08)}` })}
    >
      {tabs.map((t) => (
        <Tab key={t.value} value={t.value} label={t.label} icon={<Label color={t.color}>{counts[t.value]}</Label>} sx={{ gap: 1 }} />
      ))}
    </Tabs>
  );
}

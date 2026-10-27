import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import { alpha } from "@mui/material/styles";
import type { Store } from "../../api";
import { Label, type LabelColor } from "../../components/Label";

export type MachineFilter = "all" | "online" | "offline" | "blocked";

const TABS: Array<{ value: MachineFilter; label: string; color: LabelColor }> = [
  { value: "all", label: "Todas", color: "default" },
  { value: "online", label: "Online", color: "success" },
  { value: "offline", label: "Offline", color: "error" },
  { value: "blocked", label: "Bloqueadas", color: "warning" },
];

interface Props {
  stores: Store[];
  storeId: string;
  filter: MachineFilter;
  counts: Record<MachineFilter, number>;
  onStore: (id: string) => void;
  onFilter: (f: MachineFilter) => void;
}

export function MachinesToolbar({ stores, storeId, filter, counts, onStore, onFilter }: Props) {
  return (
    <>
      <Tabs
        value={filter}
        onChange={(_, v: MachineFilter) => onFilter(v)}
        sx={(t) => ({ px: 2.5, boxShadow: `inset 0 -2px 0 0 ${alpha(t.palette.grey[500], 0.08)}` })}
      >
        {TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} icon={<Label color={t.color}>{counts[t.value]}</Label>} sx={{ gap: 1 }} />
        ))}
      </Tabs>
      <Box sx={{ p: 2.5 }}>
        <TextField
          select
          fullWidth={false}
          value={storeId}
          onChange={(e) => onStore(e.target.value)}
          label="Lavanderia"
          sx={{ width: { xs: 1, sm: 320 } }}
          slotProps={{ htmlInput: { "aria-label": "Filtrar por lavanderia" } }}
        >
          <MenuItem value="">Selecione a lavanderia</MenuItem>
          {stores.map((s) => (
            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
          ))}
        </TextField>
      </Box>
    </>
  );
}

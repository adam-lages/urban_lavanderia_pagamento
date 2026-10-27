import SearchRounded from "@mui/icons-material/SearchRounded";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import { alpha } from "@mui/material/styles";
import { Label, type LabelColor } from "../../components/Label";

export type MachineFilter = "all" | "online" | "offline";

const TABS: Array<{ value: MachineFilter; label: string; color: LabelColor }> = [
  { value: "all", label: "Todas", color: "default" },
  { value: "online", label: "Disponíveis", color: "success" },
  { value: "offline", label: "Sem conexão", color: "error" },
];

interface Props {
  filter: MachineFilter;
  counts: Record<MachineFilter, number>;
  search: string;
  onFilter: (f: MachineFilter) => void;
  onSearch: (s: string) => void;
}

export function MachinesToolbar({ filter, counts, search, onFilter, onSearch }: Props) {
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
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por nome, placa ou loja…"
          slotProps={{
            htmlInput: { "aria-label": "Buscar máquina" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded sx={{ color: "text.disabled" }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
    </>
  );
}

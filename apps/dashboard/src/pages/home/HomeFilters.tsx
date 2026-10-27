import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { Store } from "../../api";
import { PERIOD_OPTIONS, type PeriodPreset } from "./periods";

interface Props {
  stores: Store[];
  storeId: string;
  preset: PeriodPreset;
  from: string;
  to: string;
  onStore: (v: string) => void;
  onPreset: (v: PeriodPreset) => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

export function HomeFilters({ stores, storeId, preset, from, to, onStore, onPreset, onFrom, onTo, onSearch, onClear }: Props) {
  const custom = preset === "custom";
  const invalid = !from || !to || to < from;
  return (
    <Card>
      <Box
        component="form"
        onSubmit={(e) => { e.preventDefault(); if (!invalid) onSearch(); }}
        sx={{ p: 2.5, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}
      >
        <TextField
          select
          value={storeId}
          onChange={(e) => onStore(e.target.value)}
          label="Unidade"
          sx={{ width: { xs: 1, sm: 220 } }}
          slotProps={{ htmlInput: { "aria-label": "Unidade" } }}
        >
          <MenuItem value="">Todas</MenuItem>
          {stores.map((s) => (
            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          value={preset}
          onChange={(e) => onPreset(e.target.value as PeriodPreset)}
          label="Período"
          sx={{ width: { xs: 1, sm: 200 } }}
          slotProps={{ htmlInput: { "aria-label": "Período" } }}
        >
          {PERIOD_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          label="Data inicial"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          disabled={!custom}
          sx={{ width: { xs: 1, sm: 170 } }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": "Data inicial" } }}
        />
        <TextField
          type="date"
          label="Data final"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          disabled={!custom}
          sx={{ width: { xs: 1, sm: 170 } }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": "Data final" } }}
        />
        <Button type="submit" variant="contained" color="inherit" disabled={invalid}>
          Pesquisar
        </Button>
        <Button type="button" variant="outlined" color="inherit" onClick={onClear}>
          Limpar
        </Button>
      </Box>
    </Card>
  );
}

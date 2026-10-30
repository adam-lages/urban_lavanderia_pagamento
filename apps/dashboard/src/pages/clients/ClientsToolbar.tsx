import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { FilterActions } from "../../components/FilterActions";
import type { Store } from "../../api";
import { PERIOD_OPTIONS, type PeriodPreset } from "../home/periods";
import { maskCpf, maskPhone } from "./format";

interface Props {
  stores: Store[];
  storeId: string;
  preset: PeriodPreset;
  from: string;
  to: string;
  name: string;
  cpf: string;
  phone: string;
  exportDisabled: boolean;
  onStore: (v: string) => void;
  onPreset: (v: PeriodPreset) => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onName: (v: string) => void;
  onCpf: (v: string) => void;
  onPhone: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onExport: () => void;
}

export function ClientsToolbar({
  stores,
  storeId,
  preset,
  from,
  to,
  name,
  cpf,
  phone,
  exportDisabled,
  onStore,
  onPreset,
  onFrom,
  onTo,
  onName,
  onCpf,
  onPhone,
  onSearch,
  onClear,
  onExport,
}: Props) {
  const custom = preset === "custom";
  const invalid = !storeId || !from || !to || to < from;
  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); if (!invalid) onSearch(); }} sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          select
          size="small"
          value={storeId}
          onChange={(e) => onStore(e.target.value)}
          label="Unidade"
          sx={{ width: { xs: 1, sm: 200 } }}
          slotProps={{ htmlInput: { "aria-label": "Unidade" } }}
        >
          {stores.map((s) => (
            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          value={preset}
          onChange={(e) => onPreset(e.target.value as PeriodPreset)}
          label="Data de cadastro"
          sx={{ width: { xs: 1, sm: 176 } }}
          slotProps={{ htmlInput: { "aria-label": "Data de cadastro" } }}
        >
          {PERIOD_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          size="small"
          label="Data inicial"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          disabled={!custom}
          sx={{ width: { xs: 1, sm: 148 } }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": "Data inicial" } }}
        />
        <TextField
          type="date"
          size="small"
          label="Data final"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          disabled={!custom}
          sx={{ width: { xs: 1, sm: 148 } }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": "Data final" } }}
        />
        <FilterActions searchDisabled={invalid} onClear={onClear} />
        <Box sx={{ flexGrow: 1 }} />
        <Button type="button" color="inherit" startIcon={<FileDownloadOutlined />} disabled={exportDisabled} onClick={onExport}>
          Excel
        </Button>
      </Box>
      <Accordion disableGutters elevation={0} sx={{ mt: 1, "&::before": { display: "none" }, bgcolor: "transparent" }}>
        <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ px: 0, minHeight: 40 }} slotProps={{ root: { type: "button" } }}>
          Mais opções
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0, pb: 1.5, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            size="small"
            fullWidth={false}
            value={name}
            onChange={(e) => onName(e.target.value)}
            label="Nome"
            sx={{ width: { xs: 1, sm: 240 } }}
            slotProps={{ htmlInput: { "aria-label": "Filtrar por nome" } }}
          />
          <TextField
            size="small"
            fullWidth={false}
            value={cpf}
            onChange={(e) => onCpf(maskCpf(e.target.value))}
            label="CPF"
            sx={{ width: { xs: 1, sm: 180 } }}
            slotProps={{ htmlInput: { "aria-label": "Filtrar por CPF", inputMode: "numeric" } }}
          />
          <TextField
            size="small"
            fullWidth={false}
            value={phone}
            onChange={(e) => onPhone(maskPhone(e.target.value))}
            label="Telefone"
            sx={{ width: { xs: 1, sm: 180 } }}
            slotProps={{ htmlInput: { "aria-label": "Filtrar por telefone", inputMode: "numeric" } }}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

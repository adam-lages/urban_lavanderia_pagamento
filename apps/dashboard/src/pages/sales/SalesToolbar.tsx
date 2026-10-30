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
import { maskCpf } from "../clients/format";

interface Props {
  stores: Store[];
  storeId: string;
  preset: PeriodPreset;
  from: string;
  to: string;
  customerName: string;
  customerCpf: string;
  exportDisabled: boolean;
  onStore: (v: string) => void;
  onPreset: (v: PeriodPreset) => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onCustomerName: (v: string) => void;
  onCustomerCpf: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onExport: () => void;
}

export function SalesToolbar({
  stores,
  storeId,
  preset,
  from,
  to,
  customerName,
  customerCpf,
  exportDisabled,
  onStore,
  onPreset,
  onFrom,
  onTo,
  onCustomerName,
  onCustomerCpf,
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
          label="Data de venda"
          sx={{ width: { xs: 1, sm: 160 } }}
          slotProps={{ htmlInput: { "aria-label": "Data de venda" } }}
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
            value={customerCpf}
            onChange={(e) => onCustomerCpf(maskCpf(e.target.value))}
            label="CPF"
            sx={{ width: { xs: 1, sm: 200 } }}
            slotProps={{ htmlInput: { "aria-label": "Filtrar por CPF", inputMode: "numeric" } }}
          />
          <TextField
            size="small"
            fullWidth={false}
            value={customerName}
            onChange={(e) => onCustomerName(e.target.value)}
            label="Nome do cliente"
            sx={{ width: { xs: 1, sm: 260 } }}
            slotProps={{ htmlInput: { "aria-label": "Filtrar por nome do cliente" } }}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

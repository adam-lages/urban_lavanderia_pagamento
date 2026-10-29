import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import SearchRounded from "@mui/icons-material/SearchRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { Store } from "../../api";

interface Props {
  stores: Store[];
  storeId: string;
  code: string;
  onStore: (v: string) => void;
  onCode: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  exportDisabled: boolean;
  onExport: () => void;
}

export function CouponsToolbar({ stores, storeId, code, onStore, onCode, onSearch, onClear, exportDisabled, onExport }: Props) {
  return (
    <Box
      component="form"
      onSubmit={(e) => { e.preventDefault(); onSearch(); }}
      sx={{ p: 2.5, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}
    >
      <TextField
        select
        size="small"
        fullWidth={false}
        value={storeId}
        onChange={(e) => onStore(e.target.value)}
        label="Lavanderia"
        sx={{ width: { xs: 1, sm: 240 } }}
        slotProps={{ htmlInput: { "aria-label": "Filtrar por lavanderia" } }}
      >
        <MenuItem value="" disabled>Selecione a lavanderia</MenuItem>
        {stores.map((s) => (
          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
        ))}
      </TextField>
      <TextField
        size="small"
        fullWidth={false}
        value={code}
        onChange={(e) => onCode(e.target.value)}
        placeholder="Código"
        sx={{ width: { xs: 1, sm: 200 } }}
        slotProps={{
          htmlInput: { "aria-label": "Filtrar por código" },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          },
        }}
      />
      <Button type="submit" variant="contained" color="inherit" disabled={!storeId}>
        Pesquisar
      </Button>
      <Button type="button" variant="outlined" color="inherit" onClick={onClear}>
        Limpar
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <Button type="button" color="inherit" startIcon={<FileDownloadOutlined />} disabled={exportDisabled} onClick={onExport}>
        Exportar
      </Button>
    </Box>
  );
}

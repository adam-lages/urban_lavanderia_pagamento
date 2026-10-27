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
  name: string;
  cpf: string;
  onStore: (v: string) => void;
  onName: (v: string) => void;
  onCpf: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onExport: () => void;
}

export function ClientsToolbar({ stores, storeId, name, cpf, onStore, onName, onCpf, onSearch, onClear, onExport }: Props) {
  return (
    <Box
      component="form"
      onSubmit={(e) => { e.preventDefault(); onSearch(); }}
      sx={{ p: 2.5, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}
    >
      <TextField
        select
        fullWidth={false}
        value={storeId}
        onChange={(e) => onStore(e.target.value)}
        label="Lavanderia"
        sx={{ width: { xs: 1, sm: 240 } }}
        slotProps={{ htmlInput: { "aria-label": "Filtrar por lavanderia" } }}
      >
        <MenuItem value="">Todas</MenuItem>
        {stores.map((s) => (
          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
        ))}
      </TextField>
      <TextField
        fullWidth={false}
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Nome"
        sx={{ width: { xs: 1, sm: 240 } }}
        slotProps={{
          htmlInput: { "aria-label": "Filtrar por nome" },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField
        fullWidth={false}
        value={cpf}
        onChange={(e) => onCpf(e.target.value)}
        placeholder="CPF"
        sx={{ width: { xs: 1, sm: 200 } }}
        slotProps={{
          htmlInput: { "aria-label": "Filtrar por CPF", inputMode: "numeric" },
        }}
      />
      <Button type="submit" variant="contained" color="inherit">
        Pesquisar
      </Button>
      <Button type="button" variant="outlined" color="inherit" onClick={onClear}>
        Limpar
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <Button type="button" color="inherit" startIcon={<FileDownloadOutlined />} onClick={onExport}>
        Exportar
      </Button>
    </Box>
  );
}

import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import SearchRounded from "@mui/icons-material/SearchRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

interface Props {
  name: string;
  cpf: string;
  onName: (v: string) => void;
  onCpf: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onExport: () => void;
}

export function ClientsToolbar({ name, cpf, onName, onCpf, onSearch, onClear, onExport }: Props) {
  return (
    <Box
      component="form"
      onSubmit={(e) => { e.preventDefault(); onSearch(); }}
      sx={{ p: 2.5, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}
    >
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

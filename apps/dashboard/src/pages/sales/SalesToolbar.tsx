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
  customerName: string;
  onStore: (v: string) => void;
  onCustomerName: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

export function SalesToolbar({
  stores,
  storeId,
  customerName,
  onStore,
  onCustomerName,
  onSearch,
  onClear,
}: Props) {
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
        sx={{ width: { xs: 1, sm: 260 } }}
        slotProps={{ htmlInput: { "aria-label": "Filtrar por lavanderia" } }}
      >
        <MenuItem value="">Todas</MenuItem>
        {stores.map((s) => (
          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
        ))}
      </TextField>
      <TextField
        fullWidth={false}
        value={customerName}
        onChange={(e) => onCustomerName(e.target.value)}
        placeholder="Nome do cliente"
        sx={{ width: { xs: 1, sm: 260 } }}
        slotProps={{
          htmlInput: { "aria-label": "Filtrar por nome do cliente" },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          },
        }}
      />
      <Button type="submit" variant="contained" color="inherit">
        Pesquisar
      </Button>
      <Button type="button" variant="outlined" color="inherit" onClick={onClear}>
        Limpar
      </Button>
    </Box>
  );
}

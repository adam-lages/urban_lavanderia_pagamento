import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { StoreRoleTabs, type StoreFilter } from "../../components/StoreRoleTabs";

interface Props {
  filter: StoreFilter;
  counts: Record<StoreFilter, number>;
  search: string;
  onFilter: (f: StoreFilter) => void;
  onSearch: (v: string) => void;
}

export function StoresToolbar({ filter, counts, search, onFilter, onSearch }: Props) {
  return (
    <>
      <StoreRoleTabs value={filter} counts={counts} onChange={onFilter} />
      <Box sx={{ p: 2.5 }}>
        <TextField
          size="small"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por nome, código ou CNPJ…"
          slotProps={{
            htmlInput: { "aria-label": "Buscar lavanderia" },
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

import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";

export function FilterActions({ searchDisabled, onClear }: { searchDisabled?: boolean; onClear: () => void }) {
  return (
    <Stack direction="row" spacing={0.25}>
      <Tooltip title="Pesquisar">
        <span>
          <IconButton type="submit" color="primary" aria-label="Pesquisar" disabled={searchDisabled}>
            <SearchRounded />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Limpar">
        <IconButton type="button" color="error" aria-label="Limpar" onClick={onClear}>
          <DeleteOutlineRounded />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

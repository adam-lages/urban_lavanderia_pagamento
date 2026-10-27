import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

export function DetailsButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <Tooltip title="Detalhes">
      <IconButton aria-label={label} onClick={onClick}>
        <VisibilityOutlined sx={{ fontSize: 20 }} />
      </IconButton>
    </Tooltip>
  );
}

import CheckRounded from "@mui/icons-material/CheckRounded";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { useState } from "react";
import { useThemeMode, type ThemeMode } from "../theme";

const OPTIONS: Array<{ value: ThemeMode; label: string; Icon: typeof LightModeOutlined }> = [
  { value: "light", label: "Light", Icon: LightModeOutlined },
  { value: "dark", label: "Dark", Icon: DarkModeOutlined },
];

export function ThemeModeMenu() {
  const { mode, setMode } = useThemeMode();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const Current = mode === "dark" ? DarkModeOutlined : LightModeOutlined;

  return (
    <>
      <Tooltip title="Tema">
        <IconButton aria-label="Trocar tema" onClick={(e) => setAnchor(e.currentTarget)}>
          <Current />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 160, mt: 1 } } }}
      >
        {OPTIONS.map(({ value, label, Icon }) => (
          <MenuItem
            key={value}
            selected={mode === value}
            onClick={() => { setMode(value); setAnchor(null); }}
          >
            <Icon fontSize="small" />
            <Box sx={{ flexGrow: 1 }}>{label}</Box>
            {mode === value && <CheckRounded fontSize="small" />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

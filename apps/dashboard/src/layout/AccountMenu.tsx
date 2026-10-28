import LogoutRounded from "@mui/icons-material/LogoutRounded";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ROLE_LABEL } from "../api";
import { useAuth } from "../auth";

function initials(email: string) {
  const local = email.split("@")[0] ?? "?";
  return local.slice(0, 2).toUpperCase();
}

export function AccountMenu() {
  const { logout, user, role } = useAuth();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const email = user?.email ?? "";

  return (
    <>
      <IconButton aria-label="Conta" onClick={(e) => setAnchor(e.currentTarget)} sx={{ p: 0.25, border: "2px solid", borderColor: "primary.light" }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: 14 }}>{initials(email || "ad")}</Avatar>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 220, mt: 1 } } }}
      >
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography variant="subtitle2">{ROLE_LABEL[role]}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {email || "Sessão local"}
          </Typography>
        </Box>
        <Divider sx={{ borderStyle: "dashed", my: 0.5 }} />
        <MenuItem onClick={logout} sx={{ color: "error.main" }}>
          <LogoutRounded fontSize="small" />
          Sair
        </MenuItem>
      </Menu>
    </>
  );
}

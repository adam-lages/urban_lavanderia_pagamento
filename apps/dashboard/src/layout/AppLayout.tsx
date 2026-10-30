import MenuRounded from "@mui/icons-material/MenuRounded";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Logo } from "../components/Logo";
import { DRAWER_WIDTH, HEADER_HEIGHT } from "../theme";
import { AccountMenu } from "./AccountMenu";
import { Sidebar } from "./Sidebar";
import { ThemeModeMenu } from "./ThemeModeMenu";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100%" }}>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={(theme) => ({
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { lg: `${DRAWER_WIDTH}px` },
          backdropFilter: "blur(6px)",
          backgroundColor: alpha(theme.palette.background.default, 0.8),
          "&::after": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 2,
            background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main} 42%, transparent 78%)`,
          },
        })}
      >
        <Toolbar sx={{ minHeight: { xs: HEADER_HEIGHT }, px: { xs: 2, lg: 5 }, gap: 1.5 }}>
          <IconButton edge="start" aria-label="Abrir menu" onClick={() => setMobileOpen(true)} sx={{ display: { lg: "none" } }}>
            <MenuRounded />
          </IconButton>
          <Box sx={{ display: { xs: "block", lg: "none" }, lineHeight: 0 }}>
            <Logo height={22} />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <ThemeModeMenu />
          <AccountMenu />
        </Toolbar>
      </AppBar>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        sx={{ flexGrow: 1, minWidth: 0, pt: `${HEADER_HEIGHT + 8}px`, pb: 8, px: { xs: 2, sm: 3, lg: 5 } }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

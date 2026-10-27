import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import LocalLaundryServiceOutlined from "@mui/icons-material/LocalLaundryServiceOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Typography from "@mui/material/Typography";
import { NavLink } from "react-router-dom";
import { Logo } from "../components/Logo";
import { NAV_ITEMS, NAV_SECTIONS } from "../nav";
import { DRAWER_WIDTH, HEADER_HEIGHT } from "../theme";

const ICONS: Record<(typeof NAV_ITEMS)[number]["to"], SvgIconComponent> = {
  "/": DashboardOutlined,
  "/clientes": PeopleOutlined,
  "/vendas": ReceiptLongOutlined,
  "/lavanderias": StorefrontOutlined,
  "/cupons": ConfirmationNumberOutlined,
  "/maquinas": LocalLaundryServiceOutlined,
};

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Box sx={{ height: HEADER_HEIGHT, px: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Logo />
        <Box>
          <Typography variant="subtitle2">Urban Lavanderia</Typography>
          <Typography variant="caption" color="text.secondary">
            Painel operacional
          </Typography>
        </Box>
      </Box>
      <Box component="nav" aria-label="Menu principal" sx={{ px: 2, pb: 3 }}>
        {NAV_SECTIONS.map((section) => (
          <List key={section} disablePadding subheader={<ListSubheader disableSticky>{section}</ListSubheader>}>
            {NAV_ITEMS.filter((item) => item.section === section).map((item) => {
              const Icon = ICONS[item.to];
              return (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  sx={{ mb: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: "inherit" }}>
                    <Icon sx={{ fontSize: 22 }} />
                  </ListItemIcon>
                  <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: 14, fontWeight: "inherit" } } }} />
                </ListItemButton>
              );
            })}
          </List>
        ))}
      </Box>
    </>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <Box sx={{ width: { lg: DRAWER_WIDTH }, flexShrink: { lg: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: false }}
        sx={{ display: { xs: "block", lg: "none" } }}
      >
        <NavContent onNavigate={onClose} />
      </Drawer>
      <Drawer variant="permanent" open sx={{ display: { xs: "none", lg: "block" } }}>
        <NavContent />
      </Drawer>
    </Box>
  );
}

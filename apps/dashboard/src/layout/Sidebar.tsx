import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
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
import { alpha } from "@mui/material/styles";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth";
import { NAV_ITEMS, NAV_SECTIONS, canSeeSection } from "../nav";
import { DRAWER_WIDTH } from "../theme";
import { GREY } from "../theme/palette";
import { BrandLockup } from "./BrandLockup";

const navPaper = {
  width: DRAWER_WIDTH,
  boxSizing: "border-box" as const,
  borderRight: `1px dashed ${alpha(GREY[500], 0.24)}`,
};

const ICONS: Record<(typeof NAV_ITEMS)[number]["to"], SvgIconComponent> = {
  "/": DashboardOutlined,
  "/clientes": PeopleOutlined,
  "/vendas": ReceiptLongOutlined,
  "/lavanderias": StorefrontOutlined,
  "/cupons": ConfirmationNumberOutlined,
  "/carteira": AccountBalanceWalletOutlined,
};

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  return (
    <>
      <BrandLockup />
      <Box component="nav" aria-label="Menu principal" sx={{ px: 2, pb: 3 }}>
        {NAV_SECTIONS.filter((section) => canSeeSection(section, role)).map((section) => (
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
        slotProps={{ paper: { sx: navPaper } }}
        sx={{ display: { xs: "block", lg: "none" } }}
      >
        <NavContent onNavigate={onClose} />
      </Drawer>
      <Drawer variant="permanent" open slotProps={{ paper: { sx: navPaper } }} sx={{ display: { xs: "none", lg: "block" } }}>
        <NavContent />
      </Drawer>
    </Box>
  );
}

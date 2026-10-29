import CloseRounded from "@mui/icons-material/CloseRounded";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";
import { GREY } from "../theme/palette";

export function DetailDrawer({
  title,
  open,
  onClose,
  children,
  footer,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: 1, sm: 420 },
            boxSizing: "border-box",
            borderRight: "none",
            borderLeft: `1px dashed ${alpha(GREY[500], 0.24)}`,
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <Box sx={{ px: 2.5, height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6">{title}</Typography>
        <IconButton aria-label="Fechar detalhes" onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ p: 3, flexGrow: 1, overflowY: "auto" }}>{children}</Box>
      {footer && (
        <>
          <Divider />
          <Box sx={{ p: 2.5, display: "flex", justifyContent: "flex-end", gap: 1 }}>{footer}</Box>
        </>
      )}
    </Drawer>
  );
}

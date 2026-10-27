import LocalLaundryServiceRounded from "@mui/icons-material/LocalLaundryServiceRounded";
import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Box
      aria-hidden="true"
      sx={(theme) => ({
        width: size,
        height: size,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        borderRadius: 1.5,
        color: "#fff",
        background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 70%)`,
        boxShadow: `0 8px 16px 0 ${alpha(theme.palette.primary.main, 0.24)}`,
      })}
    >
      <LocalLaundryServiceRounded sx={{ fontSize: size * 0.6 }} />
    </Box>
  );
}

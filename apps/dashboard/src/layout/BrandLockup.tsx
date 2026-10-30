import Box from "@mui/material/Box";
import { NavLink } from "react-router-dom";
import { Logo } from "../components/Logo";
import { HEADER_HEIGHT } from "../theme";

export function BrandLockup() {
  return (
    <Box
      component={NavLink}
      to="/"
      aria-label="Urban — início"
      sx={{
        height: HEADER_HEIGHT,
        mb: 1.5,
        px: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
      }}
    >
      <Logo height={43} />
    </Box>
  );
}

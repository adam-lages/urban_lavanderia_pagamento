import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import logoDark from "../assets/logo-urban-dark.png";
import logoLight from "../assets/logo-urban-light.png";

export function Logo({ height = 28 }: { height?: number }) {
  const dark = useTheme().palette.mode === "dark";
  return (
    <Box
      component="img"
      src={dark ? logoDark : logoLight}
      alt="Urban"
      sx={{ height, width: "auto", display: "block", objectFit: "contain" }}
    />
  );
}

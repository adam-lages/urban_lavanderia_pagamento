import CssBaseline from "@mui/material/CssBaseline";
import { ptBR } from "@mui/material/locale";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { type ReactNode } from "react";
import { components } from "./components";
import { palette } from "./palette";

export { DRAWER_WIDTH, HEADER_HEIGHT } from "./components";
export { GREY, SHADOWS } from "./palette";

export const theme = createTheme({
  palette,
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Public Sans", "Segoe UI", system-ui, sans-serif',
    h3: { fontWeight: 800, fontSize: 32, lineHeight: 1.4 },
    h4: { fontWeight: 700, fontSize: 24, lineHeight: 1.5 },
    h5: { fontWeight: 700, fontSize: 19, lineHeight: 1.5 },
    h6: { fontWeight: 700, fontSize: 17, lineHeight: 1.55 },
    subtitle1: { fontWeight: 600, fontSize: 16 },
    subtitle2: { fontWeight: 600, fontSize: 14, lineHeight: 1.57 },
    body2: { fontSize: 14, lineHeight: 1.57 },
    caption: { fontSize: 12, lineHeight: 1.5 },
    overline: { fontWeight: 700, fontSize: 12, letterSpacing: 1.1 },
    button: { textTransform: "none", fontWeight: 700, fontSize: 14 },
  },
  components,
}, ptBR);

export function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

import CssBaseline from "@mui/material/CssBaseline";
import { ptBR } from "@mui/material/locale";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { componentsFor } from "./components";
import { paletteFor, type ThemeMode } from "./palette";

export { DRAWER_WIDTH, HEADER_HEIGHT } from "./components";
export { GREY, type ThemeMode } from "./palette";

export const THEME_STORAGE_KEY = "lav_theme_mode";

export function createAppTheme(mode: ThemeMode) {
  return createTheme({
    palette: paletteFor(mode),
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
    components: componentsFor(mode),
  }, ptBR);
}

function storedMode(): ThemeMode {
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

interface ThemeModeValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeValue | null>(null);

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode precisa estar dentro de ThemeRegistry");
  return ctx;
}

export function ThemeRegistry({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(storedMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const value = useMemo<ThemeModeValue>(() => ({
    mode,
    setMode: (next) => {
      localStorage.setItem(THEME_STORAGE_KEY, next);
      setModeState(next);
    },
  }), [mode]);
  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

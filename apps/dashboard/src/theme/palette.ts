import { alpha } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface PaletteColor {
    lighter: string;
    darker: string;
  }
  interface SimplePaletteColorOptions {
    lighter?: string;
    darker?: string;
  }
}

export const GREY = {
  50: "#FCFDFD",
  100: "#F9FAFB",
  200: "#F4F6F8",
  300: "#DFE3E8",
  400: "#C4CDD5",
  500: "#919EAB",
  600: "#637381",
  700: "#454F5B",
  800: "#1C252E",
  900: "#141A21",
};

export const palette = {
  primary: { lighter: "#D7DBF2", light: "#6B79B8", main: "#313E78", dark: "#232C57", darker: "#151B38", contrastText: "#fff" },
  secondary: { lighter: "#CBF1FC", light: "#6CCDEC", main: "#23AFDE", dark: "#147AA0", darker: "#0A4A66", contrastText: "#fff" },
  info: { lighter: "#CBF1FC", light: "#6CCDEC", main: "#23AFDE", dark: "#147AA0", darker: "#0A4A66", contrastText: "#fff" },
  success: { lighter: "#D3FCD2", light: "#77ED8B", main: "#22C55E", dark: "#118D57", darker: "#065E49", contrastText: "#fff" },
  warning: { lighter: "#FFF6CC", light: "#FFE585", main: "#FFD951", dark: "#8F7000", darker: "#5C4800", contrastText: GREY[800] },
  error: { lighter: "#FFE9D5", light: "#FFAC82", main: "#FF5630", dark: "#B71D18", darker: "#7A0916", contrastText: "#fff" },
  grey: GREY,
  text: { primary: GREY[800], secondary: GREY[600], disabled: GREY[500] },
  background: { default: "#FFFFFF", paper: "#FFFFFF" },
  divider: alpha(GREY[500], 0.2),
  action: {
    hover: alpha(GREY[500], 0.08),
    selected: alpha(GREY[500], 0.16),
    disabled: alpha(GREY[500], 0.8),
    disabledBackground: alpha(GREY[500], 0.24),
  },
};

export const SHADOWS = {
  card: `0 0 2px 0 ${alpha(GREY[500], 0.2)}, 0 12px 24px -4px ${alpha(GREY[500], 0.12)}`,
  dropdown: `0 0 2px 0 ${alpha(GREY[500], 0.24)}, -20px 20px 40px -4px ${alpha(GREY[500], 0.24)}`,
  dialog: `-40px 40px 80px -8px ${alpha("#000", 0.24)}`,
  primary: `0 8px 16px 0 ${alpha("#313E78", 0.24)}`,
};

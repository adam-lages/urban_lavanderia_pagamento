import { alpha, type Components, type Theme } from "@mui/material/styles";
import { GREY, paletteFor, shadowsFor, type ThemeMode } from "./palette";

export const DRAWER_WIDTH = 280;
export const HEADER_HEIGHT = 72;

export function componentsFor(mode: ThemeMode): Components<Theme> {
  const palette = paletteFor(mode);
  const shadows = shadowsFor(mode);
  const muted = palette.text.secondary;
  const strong = palette.text.primary;
  return {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: 8,
          fontWeight: 700,
          ...(ownerState.variant === "contained" &&
            ownerState.color === "inherit" && {
              color: "#fff",
              backgroundColor: palette.primary.main,
              "&:hover": { backgroundColor: palette.primary.dark },
            }),
          ...(ownerState.variant === "outlined" && { borderColor: alpha(GREY[500], 0.32) }),
        }),
        sizeSmall: { height: 30, padding: "4px 8px" },
        sizeMedium: { height: 36, padding: "6px 12px" },
        sizeLarge: { height: 48, padding: "8px 16px", fontSize: 15 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: { color?: string } }) => ({
          ...((!ownerState.color || ownerState.color === "default") && { color: muted }),
        }),
      },
    },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiInputLabel: {
      styleOverrides: {
        root: { color: muted, "&.Mui-focused": { color: palette.primary.main, fontWeight: 600 } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: alpha(GREY[500], 0.2) },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: strong },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: palette.primary.main, borderWidth: 2 },
        },
      },
    },
    MuiCheckbox: { defaultProps: { size: "small" } },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" }, rounded: { borderRadius: 16 } },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, boxShadow: shadows.card, position: "relative", zIndex: 0, backgroundColor: palette.background.paper },
      },
    },
    MuiMenu: { styleOverrides: { paper: { boxShadow: shadows.dropdown, borderRadius: 10, padding: 4 } } },
    MuiMenuItem: {
      styleOverrides: { root: { borderRadius: 6, fontSize: 14, padding: "6px 8px", gap: 16 } },
    },
    MuiTableHead: { styleOverrides: { root: { backgroundColor: mode === "dark" ? alpha(GREY[500], 0.12) : GREY[200] } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px dashed ${alpha(GREY[500], 0.2)}` },
        head: { color: muted, fontWeight: 600, fontSize: 14, borderBottom: "none", whiteSpace: "nowrap" },
        body: { fontSize: 14 },
      },
    },
    MuiTablePagination: {
      styleOverrides: { root: { borderTop: `1px dashed ${alpha(GREY[500], 0.2)}` } },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: palette.primary.main, height: 2 },
      },
    },
    MuiTab: {
      defaultProps: { disableRipple: true, iconPosition: "end" },
      styleOverrides: {
        root: {
          minWidth: 0,
          minHeight: 48,
          padding: 0,
          marginRight: 40,
          fontWeight: 600,
          color: muted,
          "&.Mui-selected": { color: palette.primary.main },
        },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16, boxShadow: shadows.dialog } } },
    MuiDialogTitle: { styleOverrides: { root: { padding: 24, fontWeight: 700, fontSize: 18 } } },
    MuiDialogContent: { styleOverrides: { root: { padding: "0 24px" } } },
    MuiDialogActions: { styleOverrides: { root: { padding: 24, gap: 12 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: mode === "dark" ? GREY[700] : GREY[800], borderRadius: 6, fontSize: 12 } },
    },
    MuiBreadcrumbs: { styleOverrides: { separator: { color: GREY[500] } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 8,
          padding: "4px 8px 4px 12px",
          color: muted,
          "&.active": {
            color: palette.primary.main,
            fontWeight: 600,
            backgroundColor: alpha(palette.primary.main, 0.08),
            "&:hover": { backgroundColor: alpha(palette.primary.main, 0.16) },
          },
        },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          fontSize: 11,
          fontWeight: 700,
          lineHeight: "36px",
          textTransform: "uppercase",
          color: GREY[500],
          background: "transparent",
          paddingLeft: 12,
        },
      },
    },
    MuiAvatar: { styleOverrides: { root: { fontWeight: 600 } } },
  };
}

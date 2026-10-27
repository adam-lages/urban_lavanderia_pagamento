import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";
import { HEADER_HEIGHT } from "../theme";

const LOADING_MIN_HEIGHT = `calc(100dvh - ${HEADER_HEIGHT + 220}px)`;

const centerSx = {
  display: "grid",
  placeItems: "center",
  width: "100%",
  minHeight: LOADING_MIN_HEIGHT,
} as const;

export function LoadingCenter() {
  return (
    <Box sx={centerSx}>
      <CircularProgress aria-label="Carregando" />
    </Box>
  );
}

export function TableLoading({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <Box sx={{ position: "relative", minHeight: loading ? LOADING_MIN_HEIGHT : undefined }}>
      {children}
      {loading && (
        <Box
          sx={(theme) => ({
            ...centerSx,
            position: "absolute",
            inset: 0,
            zIndex: 1,
            height: "100%",
            bgcolor: alpha(theme.palette.background.paper, 0.72),
          })}
        >
          <CircularProgress aria-label="Carregando" />
        </Box>
      )}
    </Box>
  );
}

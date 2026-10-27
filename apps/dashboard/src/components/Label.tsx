import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import { type ReactNode } from "react";

export type LabelColor = "default" | "primary" | "info" | "success" | "warning" | "error";

export function Label({ color = "default", children }: { color?: LabelColor; children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={(theme) => {
        const tone = color === "default" ? null : theme.palette[color];
        return {
          height: 24,
          minWidth: 24,
          px: 0.75,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 0.75,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1.5,
          whiteSpace: "nowrap",
          color: tone ? tone.dark : theme.palette.text.secondary,
          backgroundColor: tone ? alpha(tone.main, 0.16) : alpha(theme.palette.grey[500], 0.16),
        };
      }}
    >
      {children}
    </Box>
  );
}

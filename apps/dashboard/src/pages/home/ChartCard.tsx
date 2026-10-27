import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, children }: Props) {
  return (
    <Card sx={{ p: 3, height: 1 }}>
      <Typography variant="h6" component="h2">{title}</Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>
      )}
      <Box sx={{ mt: 3 }}>{children}</Box>
    </Card>
  );
}

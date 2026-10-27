import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { Bar, BarChart } from "recharts";

interface Props {
  title: string;
  value: string;
  caption: string;
  color: string;
  series: number[];
}

export function StatCard({ title, value, caption, color, series }: Props) {
  return (
    <Card sx={{ p: 3, height: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" component="h2">{title}</Typography>
        <Typography variant="h3" sx={{ mt: 1.5, mb: 0.5 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{caption}</Typography>
      </Box>
      <BarChart width={96} height={48} data={series.map((v, i) => ({ i, v }))} barCategoryGap={2} aria-hidden>
        <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </Card>
  );
}

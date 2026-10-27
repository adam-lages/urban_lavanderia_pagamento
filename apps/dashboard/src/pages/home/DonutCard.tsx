import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Cell, Pie, PieChart } from "recharts";
import { ChartCard } from "./ChartCard";

export interface Slice {
  name: string;
  value: number;
  color: string;
}

interface Props {
  title: string;
  subtitle?: string;
  slices: Slice[];
  centerLabel: string;
  centerValue: string;
  footer?: string;
}

export function DonutCard({ title, subtitle, slices, centerLabel, centerValue, footer }: Props) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const drawn = total ? slices : [{ name: "Sem dados", value: 1, color: "rgba(145,158,171,0.24)" }];
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <Box sx={{ position: "relative", width: 220, height: 220, mx: "auto" }}>
        <PieChart width={220} height={220}>
          <Pie data={drawn} dataKey="value" innerRadius={72} outerRadius={104} paddingAngle={total ? 2 : 0} stroke="none" isAnimationActive={false}>
            {drawn.map((s) => <Cell key={s.name} fill={s.color} />)}
          </Pie>
        </PieChart>
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="caption" color="text.secondary">{centerLabel}</Typography>
          <Typography variant="h4">{centerValue}</Typography>
        </Box>
      </Box>
      <Stack direction="row" spacing={2} useFlexGap sx={{ justifyContent: "center", flexWrap: "wrap", mt: 3 }}>
        {slices.map((s) => (
          <Stack key={s.name} direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: s.color }} />
            <Typography variant="body2">
              {s.name}: <strong>{total ? Math.round((s.value / total) * 100) : 0}%</strong> ({s.value})
            </Typography>
          </Stack>
        ))}
      </Stack>
      {footer && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 2 }}>
          {footer}
        </Typography>
      )}
    </ChartCard>
  );
}

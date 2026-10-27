import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brl } from "../../api";
import { ChartCard } from "./ChartCard";

export type ChartUnit = "money" | "count";

export const formatUnit = (unit: ChartUnit, v: number) => (unit === "money" ? brl(v) : String(v));
const axisUnit = (unit: ChartUnit, v: number) => (unit === "money" ? `R$ ${Math.round(v / 100)}` : String(v));

interface Props {
  title: string;
  subtitle?: string;
  data: Array<Record<string, number | string>>;
  xKey: string;
  yKey: string;
  unit: ChartUnit;
  color: string;
  name: string;
  xLabel?: (v: string | number) => string;
}

export function BarsCard({ title, subtitle, data, xKey, yKey, unit, color, name, xLabel }: Props) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(145,158,171,0.24)" />
          <XAxis dataKey={xKey} tickFormatter={xLabel} tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickFormatter={(v: number) => axisUnit(unit, v)} tickLine={false} axisLine={false} fontSize={12} width={unit === "money" ? 64 : 36} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(145,158,171,0.08)" }}
            formatter={(v) => [formatUnit(unit, Number(v)), name]}
            labelFormatter={(l) => (xLabel ? xLabel(l as string | number) : String(l))}
          />
          <Bar dataKey={yKey} name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

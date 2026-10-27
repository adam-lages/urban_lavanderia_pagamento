import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Overview } from "../../api";
import { ChartCard } from "./ChartCard";
import { formatDayShort } from "./periods";

export function SignupsCard({ signups, color }: { signups: Overview["signups"]; color: string }) {
  return (
    <ChartCard
      title="Evolução de cadastro de clientes"
      subtitle={`Mês atual (${signups.month}): ${signups.total} ${signups.total === 1 ? "novo cliente" : "novos clientes"}`}
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={signups.byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(145,158,171,0.24)" />
          <XAxis dataKey="date" tickFormatter={formatDayShort} tickLine={false} axisLine={false} fontSize={12} minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} allowDecimals={false} />
          <Tooltip labelFormatter={(l) => formatDayShort(String(l))} formatter={(v) => [String(v), "Clientes acumulados"]} />
          <Area type="monotone" dataKey="cumulative" stroke={color} strokeWidth={3} fill="url(#signupsFill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

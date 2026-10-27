import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { brl, type Overview } from "../../api";
import { ChartCard } from "./ChartCard";

interface Props {
  title: string;
  color: "secondary" | "warning";
  machines: Overview["machines"];
  showStore: boolean;
}

export function MachineRevenueCard({ title, color, machines, showStore }: Props) {
  const max = Math.max(1, ...machines.map((m) => m.revenueCents));
  const total = machines.reduce((s, m) => s + m.revenueCents, 0);
  return (
    <ChartCard title={title} subtitle={`Total ${brl(total)}`}>
      {machines.length === 0 && (
        <Typography variant="body2" color="text.secondary">Nenhuma máquina cadastrada.</Typography>
      )}
      <Stack spacing={3}>
        {machines.map((m) => (
          <Box key={m.machineId}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="subtitle2">{showStore ? `${m.label} · ${m.storeName}` : m.label}</Typography>
              <Typography variant="body2">
                {brl(m.revenueCents)}{" "}
                <Typography component="span" variant="caption" color="text.secondary">
                  ({m.cycles} {m.cycles === 1 ? "ciclo" : "ciclos"})
                </Typography>
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              color={color}
              value={(m.revenueCents / max) * 100}
              aria-label={`Faturamento ${m.label} ${m.storeName}`}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        ))}
      </Stack>
    </ChartCard>
  );
}

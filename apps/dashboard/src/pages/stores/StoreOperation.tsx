import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { api, type StorePresence } from "../../api";
import { EmptyContent } from "../../components/EmptyContent";
import { PresenceTimeline } from "./operation/PresenceTimeline";
import { formatDuration, uptimePercent } from "./operation/format";

const PERIODS = [{ hours: 24, label: "24h" }, { hours: 168, label: "7 dias" }] as const;

function Legend() {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: "center" }}>
      {([["success.main", "Em operação"], ["error.main", "Fora de operação"]] as const).map(([color, label]) => (
        <Stack key={label} direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color }} />
          <Typography variant="caption">{label}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function StoreOperation({ storeId }: { storeId: string }) {
  const [hours, setHours] = useState<number>(24);
  const [data, setData] = useState<StorePresence | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setData(null);
    api<StorePresence>(`/stores/${storeId}/presence?hours=${hours}`)
      .then((d) => { if (active) { setData(d); setError(""); } })
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, [storeId, hours]);

  const online = data?.machines.reduce((t, m) => t + m.onlineMs, 0) ?? 0;
  const offline = data?.machines.reduce((t, m) => t + m.offlineMs, 0) ?? 0;
  const period = PERIODS.find((p) => p.hours === hours)!.label;

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <CardHeader
          title={`Histórico últimas ${period}`}
          subheader={data && data.machines.length > 0
            ? `Disponibilidade geral ${uptimePercent(online, offline)}% · fora de operação ${formatDuration(offline)} somando as placas`
            : undefined}
          action={(
            <ToggleButtonGroup size="small" exclusive value={hours} onChange={(_, v: number | null) => v && setHours(v)} aria-label="Período">
              {PERIODS.map((p) => <ToggleButton key={p.hours} value={p.hours}>{p.label}</ToggleButton>)}
            </ToggleButtonGroup>
          )}
        />
        <Box sx={{ p: 3, pt: 2 }}>
          {!data && !error && <Stack sx={{ alignItems: "center", py: 4 }}><CircularProgress size={28} aria-label="Carregando histórico" /></Stack>}
          {data && !data.machines.length && (
            <EmptyContent title="Nenhuma placa vinculada" description="Vincule uma placa ESP32 a uma máquina para acompanhar a operação." />
          )}
          {data && data.machines.length > 0 && (
            <Stack spacing={3}>
              <Legend />
              <PresenceTimeline data={data} />
            </Stack>
          )}
        </Box>
      </Card>
    </>
  );
}

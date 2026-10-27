import DryCleaningOutlined from "@mui/icons-material/DryCleaningOutlined";
import LocalLaundryServiceOutlined from "@mui/icons-material/LocalLaundryServiceOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { machineKindLabel, machineStatusLabel, type Machine } from "../../api";
import { Label } from "../../components/Label";
import { formatDateParts } from "./format";

function stamp(value?: string) {
  const p = formatDateParts(value || null);
  return p.time ? `${p.date} ${p.time}` : p.date;
}

export function MachineProfile({ machine: m }: { machine: Machine }) {
  const Icon = m.kind === "DRYER" ? DryCleaningOutlined : LocalLaundryServiceOutlined;
  const tone = m.kind === "DRYER" ? "warning" : "info";
  const statusColor = m.status === "ONLINE" ? "success" : m.status === "IN_USE" ? "warning" : "error";
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ p: 3, height: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Label color={statusColor}>{machineStatusLabel(m.status)}</Label>
            {m.blocked && <Label color="error">BLOQUEADA</Label>}
          </Box>
          <Stack sx={{ alignItems: "center", textAlign: "center", pt: 1 }}>
            <Avatar
              variant="rounded"
              sx={(t) => ({
                width: 96,
                height: 96,
                bgcolor: alpha(t.palette[tone].main, 0.12),
                color: `${tone}.dark`,
                borderRadius: 2,
                mb: 2,
              })}
            >
              <Icon sx={{ fontSize: 48 }} />
            </Avatar>
            <Typography variant="subtitle1">{m.label}</Typography>
            <Typography variant="body2" color="text.secondary">{machineKindLabel(m.kind)}</Typography>
          </Stack>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField label="Lavanderia" value={m.storeName || "—"} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Código" value={m.code || "—"} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Placa ESP32" value={m.deviceId} slotProps={{ input: { readOnly: true } }} />
            <TextField
              label="IP da ESP32"
              value={m.ip || "—"}
              helperText="IP enviado pela placa no último heartbeat. Não cadastre à mão: muda com DHCP."
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField label="Canal" value={String(m.channel)} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Última vez vista" value={stamp(m.lastSeenAt)} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Última liberação" value={stamp(m.lastReleasedAt)} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Último bloqueio" value={stamp(m.lastBlockedAt)} slotProps={{ input: { readOnly: true } }} />
          </Box>
        </Card>
      </Grid>
    </Grid>
  );
}

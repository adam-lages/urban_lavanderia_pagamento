import DryCleaningOutlined from "@mui/icons-material/DryCleaningOutlined";
import LocalLaundryServiceOutlined from "@mui/icons-material/LocalLaundryServiceOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
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

export function MachineProfile({
  machine: m,
  onToggleBlock,
}: {
  machine: Machine;
  onToggleBlock: (blocked: boolean) => void;
}) {
  const Icon = m.kind === "DRYER" ? DryCleaningOutlined : LocalLaundryServiceOutlined;
  const tone = m.kind === "DRYER" ? "warning" : "secondary";
  const statusColor = m.status === "ONLINE" ? "success" : m.status === "IN_USE" ? "warning" : "error";
  const blocked = m.blocked;
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ p: 3, height: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Label color={statusColor}>{machineStatusLabel(m.status)}</Label>
            {blocked && <Label color="error">BLOQUEADA</Label>}
          </Box>
          <Stack sx={{ alignItems: "center", textAlign: "center", pt: 1 }}>
            <Box
              sx={(t) => ({
                width: 144,
                height: 144,
                borderRadius: "50%",
                border: `1px dashed ${alpha(t.palette.grey[500], 0.32)}`,
                p: 1,
                mb: 2,
              })}
            >
              <Avatar
                sx={(t) => ({
                  width: 1,
                  height: 1,
                  bgcolor: alpha(t.palette[tone].main, 0.12),
                  color: `${tone}.dark`,
                })}
              >
                <Icon sx={{ fontSize: 64 }} />
              </Avatar>
            </Box>
            <Typography variant="subtitle1">{m.label}</Typography>
            <Typography variant="body2" color="text.secondary">{machineKindLabel(m.kind)}</Typography>
          </Stack>
          <Box sx={{ mt: 4 }}>
            <FormControlLabel
              sx={{ alignItems: "flex-start", ml: 0, gap: 1 }}
              control={
                <Switch
                  checked={blocked}
                  onChange={(_, v) => onToggleBlock(v)}
                  slotProps={{ input: { "aria-label": "Bloquear máquina" } }}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2">Bloqueada</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Impede a liberação da máquina.
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField label="Lavanderia" value={m.storeName || "—"} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Código" value={m.code || "—"} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Placa ESP32" value={m.deviceId || "—"} slotProps={{ input: { readOnly: true } }} />
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

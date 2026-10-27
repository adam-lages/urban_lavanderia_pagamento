import DryCleaningOutlined from "@mui/icons-material/DryCleaningOutlined";
import LocalLaundryServiceOutlined from "@mui/icons-material/LocalLaundryServiceOutlined";
import LockOpenRounded from "@mui/icons-material/LockOpenRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { machineStatusLabel, type Machine, type MachineStatus } from "../../api";
import { Label, type LabelColor } from "../../components/Label";

export function canRelease(m: Machine) {
  return !m.blocked && m.status === "ONLINE";
}

export function releaseHint(m: Machine) {
  if (m.blocked) return "Desbloqueie a máquina para liberar";
  if (m.status !== "ONLINE") return "Só é possível liberar com a placa ONLINE";
  return "Liberar";
}

function statusColor(status: MachineStatus | undefined): LabelColor {
  if (status === "ONLINE") return "success";
  if (status === "IN_USE") return "warning";
  return "error";
}

export function MachineCard({
  machine: m,
  onRelease,
  onToggleBlock,
}: {
  machine: Machine;
  onRelease: () => void;
  onToggleBlock: () => void;
}) {
  const washer = m.kind === "WASHER";
  const Icon = washer ? LocalLaundryServiceOutlined : DryCleaningOutlined;
  const tone = washer ? "info" : "warning";
  return (
    <Card sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2, height: 1 }}>
      <Avatar sx={(t) => ({ width: 48, height: 48, bgcolor: alpha(t.palette[tone].main, 0.16), color: `${tone}.dark` })}>
        <Icon />
      </Avatar>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap>{m.label}</Typography>
        <Typography variant="caption" color="text.disabled">{m.code}</Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", mt: 0.5 }}>
          <Label color={statusColor(m.status)}>{machineStatusLabel(m.status)}</Label>
          {m.blocked && <Label color="error">Bloqueada</Label>}
        </Stack>
      </Box>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        <Tooltip title={releaseHint(m)}>
          <span>
            <Button
              size="small"
              variant="contained"
              startIcon={<PlayArrowRounded />}
              disabled={!canRelease(m)}
              onClick={onRelease}
            >
              Liberar
            </Button>
          </span>
        </Tooltip>
        <Button
          size="small"
          variant="outlined"
          color={m.blocked ? "success" : "error"}
          startIcon={m.blocked ? <LockOpenRounded /> : <LockRounded />}
          onClick={onToggleBlock}
        >
          {m.blocked ? "Desbloquear" : "Bloquear"}
        </Button>
      </Stack>
    </Card>
  );
}

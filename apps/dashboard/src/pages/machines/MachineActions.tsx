import LockOpenRounded from "@mui/icons-material/LockOpenRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import type { Machine } from "../../api";

export function canRelease(m: Machine) {
  return !m.blocked && m.status === "ONLINE";
}

export function releaseHint(m: Machine) {
  if (m.blocked) return "Desbloqueie a máquina para liberar";
  if (m.status !== "ONLINE") return "Só é possível liberar com a placa ONLINE";
  return "Liberar";
}

export function MachineActions({ machine: m, onRelease, onToggleBlock }: {
  machine: Machine;
  onRelease: () => void;
  onToggleBlock: () => void;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
      <Tooltip title={releaseHint(m)}>
        <span>
          <Button size="small" variant="contained" startIcon={<PlayArrowRounded />} disabled={!canRelease(m)} onClick={onRelease}>
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
  );
}

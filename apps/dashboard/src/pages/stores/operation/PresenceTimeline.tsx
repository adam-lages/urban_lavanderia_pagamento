import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import type { MachinePresence, PresenceSegment, StorePresence } from "../../../api";
import { formatDuration, moment, tickLabel, timeTicks, uptimePercent } from "./format";

const LABEL_WIDTH = 150;
const MIN_TEXT_SHARE = 0.07;
const EDGE_SHARE = 0.04;

const statusLabel = (s: PresenceSegment["status"]) => (s === "online" ? "Em operação" : "Fora de operação");

function Segment({ segment, share }: { segment: PresenceSegment; share: number }) {
  const theme = useTheme();
  const color = segment.status === "online" ? theme.palette.success.main : theme.palette.error.main;
  const duration = Date.parse(segment.to) - Date.parse(segment.from);
  return (
    <Tooltip
      arrow
      title={(
        <>
          <strong>{statusLabel(segment.status)}</strong>
          <br />
          {moment(segment.from)} → {moment(segment.to)}
          <br />
          {formatDuration(duration)}
        </>
      )}
    >
      <Box
        role="img"
        aria-label={`${statusLabel(segment.status)} por ${formatDuration(duration)}`}
        sx={{
          width: `${share * 100}%`,
          bgcolor: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "common.white",
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          transition: "filter .15s",
          "&:hover": { filter: "brightness(1.12)" },
        }}
      >
        {share >= MIN_TEXT_SHARE && formatDuration(duration)}
      </Box>
    </Tooltip>
  );
}

function Row({ machine, span }: { machine: MachinePresence; span: number }) {
  const uptime = uptimePercent(machine.onlineMs, machine.offlineMs);
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <Box sx={{ width: LABEL_WIDTH, flexShrink: 0 }}>
        <Typography variant="subtitle2" noWrap>{machine.label}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="div">
          {machine.deviceId} · {uptime}%
        </Typography>
      </Box>
      <Box
        aria-label={`Linha do tempo ${machine.label}`}
        sx={{ flex: 1, minWidth: 0, display: "flex", height: 36, borderRadius: 1, overflow: "hidden", bgcolor: "action.hover" }}
      >
        {machine.segments.map((s) => (
          <Segment key={s.from} segment={s} share={(Date.parse(s.to) - Date.parse(s.from)) / span} />
        ))}
      </Box>
    </Stack>
  );
}

export function PresenceTimeline({ data }: { data: StorePresence }) {
  const theme = useTheme();
  const from = Date.parse(data.from);
  const to = Date.parse(data.to);
  const span = to - from;
  const { ticks, daily } = timeTicks(from, to);
  return (
    <Stack spacing={1.5}>
      {data.machines.map((m) => <Row key={m.machineId} machine={m} span={span} />)}
      <Stack direction="row" spacing={2}>
        <Box sx={{ width: LABEL_WIDTH, flexShrink: 0 }} />
        <Box sx={{ flex: 1, position: "relative", height: 24, borderTop: `1px dashed ${alpha(theme.palette.grey[500], 0.3)}` }}>
          {ticks.map((t) => {
            const share = (t - from) / span;
            const shift = share < EDGE_SHARE ? "0" : share > 1 - EDGE_SHARE ? "-100%" : "-50%";
            return (
              <Typography
                key={t}
                variant="caption"
                color="text.secondary"
                sx={{ position: "absolute", top: 4, left: `${share * 100}%`, transform: `translateX(${shift})`, whiteSpace: "nowrap" }}
              >
                {tickLabel(t, daily)}
              </Typography>
            );
          })}
        </Box>
      </Stack>
    </Stack>
  );
}

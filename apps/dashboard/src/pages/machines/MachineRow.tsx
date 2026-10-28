import Stack from "@mui/material/Stack";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { machineStatusLabel, type Machine } from "../../api";
import { DetailsButton } from "../../components/DetailsButton";
import { Label } from "../../components/Label";
import { formatDateParts } from "./format";
import { MachineActions } from "./MachineActions";

function statusColor(m: Machine) {
  if (m.status === "ONLINE") return "success" as const;
  if (m.status === "IN_USE") return "warning" as const;
  return "error" as const;
}

export function MachineRow({ machine: m, onDetails, onRelease, onToggleBlock }: {
  machine: Machine;
  onDetails: () => void;
  onRelease: () => void;
  onToggleBlock: () => void;
}) {
  const released = formatDateParts(m.lastReleasedAt || null);
  const blocked = formatDateParts(m.lastBlockedAt || null);
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="subtitle2">{m.label}</Typography>
      </TableCell>
      <TableCell>
        <Label color={statusColor(m)}>{machineStatusLabel(m.status)}</Label>
      </TableCell>
      <TableCell>{m.code}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="body2">{released.date}</Typography>
        <Typography variant="caption" color="text.disabled">{released.time}</Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="body2">{blocked.date}</Typography>
        <Typography variant="caption" color="text.disabled">{blocked.time}</Typography>
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
          <MachineActions machine={m} onRelease={onRelease} onToggleBlock={onToggleBlock} />
          <DetailsButton label={`Detalhes de ${m.label}`} onClick={onDetails} />
        </Stack>
      </TableCell>
    </TableRow>
  );
}

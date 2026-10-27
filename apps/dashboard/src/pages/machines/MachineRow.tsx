import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { machineStatusLabel, type Machine } from "../../api";
import { DetailsButton } from "../../components/DetailsButton";
import { Label } from "../../components/Label";
import { formatDateParts } from "./format";

function statusColor(m: Machine) {
  if (m.status === "ONLINE") return "success" as const;
  if (m.status === "IN_USE") return "warning" as const;
  return "error" as const;
}

export function MachineRow({ machine: m, onDetails }: { machine: Machine; onDetails: () => void }) {
  const released = formatDateParts(m.lastReleasedAt || null);
  const blocked = formatDateParts(m.lastBlockedAt || null);
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="subtitle2">{m.label}</Typography>
        <Typography variant="caption" color="text.disabled">{m.code}</Typography>
      </TableCell>
      <TableCell>
        <Label color={statusColor(m)}>{machineStatusLabel(m.status)}</Label>
        {m.blocked && (
          <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 0.5 }}>
            Bloqueada
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="body2">{released.date}</Typography>
        <Typography variant="caption" color="text.disabled">{released.time}</Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="body2">{blocked.date}</Typography>
        <Typography variant="caption" color="text.disabled">{blocked.time}</Typography>
      </TableCell>
      <TableCell align="right">
        <DetailsButton label={`Detalhes de ${m.label}`} onClick={onDetails} />
      </TableCell>
    </TableRow>
  );
}

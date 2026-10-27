import DryCleaningOutlined from "@mui/icons-material/DryCleaningOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import LocalLaundryServiceOutlined from "@mui/icons-material/LocalLaundryServiceOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { kindLabel, type Board } from "../../api";
import { Label } from "../../components/Label";
import { displayName, formatDateParts, formatDateTime, stateColor, stateLabel, type CommandDetail } from "./format";

interface Props {
  board: Board;
  command?: CommandDetail;
  showLog: boolean;
  onRelease: () => void;
  onEdit: () => void;
  onToggleLog: () => void;
}

function MachineAvatar({ board }: { board: Board }) {
  const Icon = board.kind === "DRYER" ? DryCleaningOutlined : LocalLaundryServiceOutlined;
  const tone = board.kind === "DRYER" ? "warning" : "info";
  return (
    <Avatar variant="rounded" sx={(t) => ({ bgcolor: alpha(t.palette[tone].main, 0.12), color: `${tone}.dark`, borderRadius: 1.5 })}>
      <Icon />
    </Avatar>
  );
}

export function MachineRow({ board: b, command, showLog, onRelease, onEdit, onToggleLog }: Props) {
  const lastStatus = command?.status ?? b.lastCommand?.status;
  const seen = formatDateParts(b.lastSeenAt);
  const editLabel = b.registered ? "Editar" : "Cadastrar";

  return (
    <>
      <TableRow hover>
        <TableCell>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <MachineAvatar board={b} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {displayName(b)}
              </Typography>
              <Typography variant="body2" color="text.disabled" component="code" noWrap>
                {b.deviceId}
              </Typography>
            </Box>
          </Stack>
        </TableCell>
        <TableCell>{b.kind ? kindLabel(b.kind) : "—"}</TableCell>
        <TableCell>{b.storeName ?? "—"}</TableCell>
        <TableCell>
          <Label color={b.online ? "success" : "error"}>{b.online ? "Online" : "Offline"}</Label>
          {b.info && (
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.5 }}>
              {b.info.rssi ?? "?"} dBm · v{b.info.fw ?? "?"}
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2">{seen.date}</Typography>
          <Typography variant="caption" color="text.disabled">
            {seen.time}
          </Typography>
        </TableCell>
        <TableCell>
          {lastStatus && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <Label color={stateColor(lastStatus)}>{stateLabel(lastStatus)}</Label>
              {command && (
                <Button size="small" color="inherit" onClick={onToggleLog}>
                  {showLog ? "Ocultar log" : "Log"}
                </Button>
              )}
            </Stack>
          )}
        </TableCell>
        <TableCell align="right">
          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", alignItems: "center" }}>
            <Button size="small" variant="contained" disabled={!b.online} title={b.online ? "" : "Placa offline"} onClick={onRelease}>
              Liberar
            </Button>
            <Tooltip title={editLabel}>
              <IconButton aria-label={editLabel} onClick={onEdit}>
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      </TableRow>
      {showLog && command && (
        <TableRow>
          <TableCell colSpan={7} sx={{ bgcolor: "grey.100" }}>
            <Box component="ul" sx={{ m: 0, pl: 2, color: "text.secondary", fontSize: 13 }}>
              {command.events.map((e, i) => (
                <li key={i}>
                  {formatDateTime(e.createdAt)} — <strong>{e.type}</strong> {e.detail}
                </li>
              ))}
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

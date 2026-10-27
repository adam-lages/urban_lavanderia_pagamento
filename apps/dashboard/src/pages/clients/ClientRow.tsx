import ArrowForwardIosRounded from "@mui/icons-material/ArrowForwardIosRounded";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { Customer } from "../../api";
import { Label } from "../../components/Label";
import { formatBirth, formatCpf, formatCreated, formatPhone, whatsappUrl } from "./format";

export function ClientRow({ customer: c, onDetails }: { customer: Customer; onDetails: () => void }) {
  const created = formatCreated(c.createdAt);
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{c.storeName || "—"}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="subtitle2">{c.name}</Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="body2">{formatBirth(c.birthDate)}</Typography>
        <Typography variant="caption" color="text.disabled">
          {c.age} anos
        </Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatCpf(c.cpf)}</TableCell>
      <TableCell>{c.email}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="body2">{formatPhone(c.phone)}</Typography>
        <Link href={whatsappUrl(c.phone)} target="_blank" rel="noopener noreferrer" variant="caption" underline="hover">
          WhatsApp
        </Link>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="body2">{created.date}</Typography>
        <Typography variant="caption" color="text.disabled">
          {created.time}
        </Typography>
      </TableCell>
      <TableCell>
        <Label color={c.blocked ? "error" : "success"}>{c.blocked ? "BLOQUEADO" : "ATIVO"}</Label>
      </TableCell>
      <TableCell align="right">
        <Tooltip title="Detalhes">
          <IconButton aria-label={`Detalhes de ${c.name}`} onClick={onDetails}>
            <ArrowForwardIosRounded sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

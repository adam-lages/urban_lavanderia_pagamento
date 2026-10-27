import Link from "@mui/material/Link";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { Customer } from "../../api";
import { DetailsButton } from "../../components/DetailsButton";
import { Label } from "../../components/Label";
import { formatCpf, formatCreated, formatPhone, whatsappUrl } from "./format";

export function ClientRow({ customer: c, onDetails }: { customer: Customer; onDetails: () => void }) {
  const created = formatCreated(c.createdAt);
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{c.storeName || "—"}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="subtitle2">{c.name}</Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatCpf(c.cpf)}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="body2">{formatPhone(c.phone)}</Typography>
        <Link href={whatsappUrl(c.phone)} target="_blank" rel="noopener noreferrer" variant="caption" underline="hover">
          WhatsApp
        </Link>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="body2">{created.date}</Typography>
        <Typography variant="caption" color="text.disabled">{created.time}</Typography>
      </TableCell>
      <TableCell>
        <Label color={c.blocked ? "error" : "success"}>{c.blocked ? "BLOQUEADO" : "ATIVO"}</Label>
      </TableCell>
      <TableCell align="right">
        <DetailsButton label={`Detalhes de ${c.name}`} onClick={onDetails} />
      </TableCell>
    </TableRow>
  );
}

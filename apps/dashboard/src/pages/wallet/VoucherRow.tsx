import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { brl, type Voucher } from "../../api";
import { DetailsButton } from "../../components/DetailsButton";
import { Label, type LabelColor } from "../../components/Label";
import { periodLabel } from "../coupons/format";
import { categoryLabel, voucherStatus } from "./format";

const STATUS_COLOR: Record<ReturnType<typeof voucherStatus>, LabelColor> = {
  ATIVO: "success",
  PROGRAMADO: "info",
  EXPIRADO: "error",
  "SEM SALDO": "default",
};

export function VoucherRow({ voucher: v, onDetails }: { voucher: Voucher; onDetails: () => void }) {
  const status = voucherStatus(v);
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="subtitle2">{v.code}</Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{categoryLabel(v.category)}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{v.storeName}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{brl(v.amountCents)}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="subtitle2">{brl(v.balanceCents)}</Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{periodLabel(v.validFrom, v.validTo)}</TableCell>
      <TableCell>
        <Label color={STATUS_COLOR[status]}>{status}</Label>
      </TableCell>
      <TableCell align="right">
        <DetailsButton label={`Detalhes de ${v.code}`} onClick={onDetails} />
      </TableCell>
    </TableRow>
  );
}

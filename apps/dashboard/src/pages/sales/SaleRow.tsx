import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { brl, type Sale } from "../../api";
import { formatCpf } from "../clients/format";
import { dash, paymentMethodLabel } from "./format";

export function SaleRow({ sale: s }: { sale: Sale }) {
  const when = s.paidAt ? new Date(s.paidAt) : null;
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{s.storeName}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="subtitle2">{dash(s.customerName)}</Typography>
        <Typography variant="caption" color="text.disabled">
          {s.customerCpf ? formatCpf(s.customerCpf) : "—"}
        </Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{s.machineLabel}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        {when ? (
          <>
            <Typography variant="body2">{when.toLocaleDateString("pt-BR")}</Typography>
            <Typography variant="caption" color="text.disabled">
              {when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </Typography>
          </>
        ) : "—"}
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{brl(s.amountCents)}</TableCell>
      <TableCell>{paymentMethodLabel(s.paymentMethod)}</TableCell>
      <TableCell>{dash(s.couponCode)}</TableCell>
      <TableCell>{dash(s.voucherCode)}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{dash(s.authCode)}</TableCell>
      <TableCell>{dash(s.cardBrand)}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{dash(s.cardNumber)}</TableCell>
    </TableRow>
  );
}

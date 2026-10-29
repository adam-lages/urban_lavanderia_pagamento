import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { brl, type Sale } from "../../api";
import { DetailsButton } from "../../components/DetailsButton";
import { dash, formatPaidAt, paymentMethodLabel } from "../sales/format";

export function PurchaseRow({ sale: s, onDetails }: { sale: Sale; onDetails: () => void }) {
  const when = formatPaidAt(s.paidAt);
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        {s.paidAt ? (
          <>
            <Typography variant="body2">{when.date}</Typography>
            <Typography variant="caption" color="text.disabled">{when.time}</Typography>
          </>
        ) : "—"}
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{s.machineLabel}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{brl(s.paidCents)}</TableCell>
      <TableCell>{paymentMethodLabel(s.paymentMethod)}</TableCell>
      <TableCell>{dash(s.couponCode)}</TableCell>
      <TableCell align="right">
        <DetailsButton label={`Detalhes da venda em ${s.machineLabel}`} onClick={onDetails} />
      </TableCell>
    </TableRow>
  );
}

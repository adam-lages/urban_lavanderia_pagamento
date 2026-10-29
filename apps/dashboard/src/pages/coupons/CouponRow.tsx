import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { Coupon } from "../../api";
import { DetailsButton } from "../../components/DetailsButton";
import { Label, type LabelColor } from "../../components/Label";
import { couponStatus, discountLabel, periodLabel, storeScope } from "./format";

const STATUS_COLOR: Record<ReturnType<typeof couponStatus>, LabelColor> = {
  ATIVO: "success",
  PROGRAMADO: "info",
  EXPIRADO: "error",
};

export function CouponRow({ coupon: c, onDetails }: { coupon: Coupon; onDetails: () => void }) {
  const status = couponStatus(c);
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="subtitle2">{c.code}</Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{discountLabel(c)}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{storeScope(c)}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{periodLabel(c.validFrom, c.validTo)}</TableCell>
      <TableCell sx={{ whiteSpace: "nowrap" }}>{c.usageLimit == null ? "Ilimitado" : c.usageLimit}</TableCell>
      <TableCell>
        <Label color={STATUS_COLOR[status]}>{status}</Label>
      </TableCell>
      <TableCell align="right">
        <DetailsButton label={`Detalhes de ${c.code}`} onClick={onDetails} />
      </TableCell>
    </TableRow>
  );
}

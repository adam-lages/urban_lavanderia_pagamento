import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { brl, type Sale } from "../../api";
import { DetailDrawer } from "../../components/DetailDrawer";
import { formatCpf } from "../clients/format";
import { dash, formatPaidAt, paymentMethodLabel } from "./format";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle2">{value}</Typography>
    </Box>
  );
}

export function SaleDetails({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const when = sale ? formatPaidAt(sale.paidAt) : { date: "—", time: "" };
  return (
    <DetailDrawer title="Detalhes da venda" open={Boolean(sale)} onClose={onClose}>
      {sale && (
        <Stack spacing={2.5}>
          <Field label="Unidade" value={dash(sale.storeName)} />
          <Field label="Cliente" value={dash(sale.customerName)} />
          <Field label="CPF" value={sale.customerCpf ? formatCpf(sale.customerCpf) : "—"} />
          <Field label="Máquina" value={dash(sale.machineLabel)} />
          <Field label="Data da compra" value={when.time ? `${when.date} ${when.time}` : when.date} />
          <Field label="Valor pago" value={brl(sale.amountCents)} />
          <Field label="Método" value={paymentMethodLabel(sale.paymentMethod)} />
          <Field label="Cupom" value={dash(sale.couponCode)} />
          <Field label="Voucher" value={dash(sale.voucherCode)} />
          <Field label="Stone Authcode" value={dash(sale.authCode)} />
          <Field label="Bandeira" value={dash(sale.cardBrand)} />
          <Field label="Número do cartão" value={dash(sale.cardNumber)} />
        </Stack>
      )}
    </DetailDrawer>
  );
}

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import type { Store } from "../../api";
import { formatCnpj, roleLabel } from "./format";
import { STORE_FIELDS_GRID, StoreSection } from "./StoreFieldsLayout";

function ReadField({ label, value, disabled }: { label: string; value: string; disabled?: boolean }) {
  return (
    <TextField
      label={label}
      value={value}
      disabled={disabled}
      slotProps={{ htmlInput: { "aria-label": label, readOnly: true } }}
    />
  );
}

export function StoreData({ store }: { store: Store }) {
  return (
    <Card>
      <CardContent>
        <Box sx={STORE_FIELDS_GRID}>
          <StoreSection title="Dados da empresa" />
          <ReadField label="Razão social" value={store.legalName || "—"} />
          <ReadField label="Nome fantasia" value={store.name} />
          <ReadField label="CNPJ" value={formatCnpj(store.cnpj) || "—"} />
          <ReadField label="Permissão" value={roleLabel(store.role)} disabled />
          <ReadField label="Código" value={store.code} disabled />
          <ReadField label="Endereço" value={store.address || "—"} />
          <StoreSection title="Acesso ao sistema" />
          <ReadField label="E-mail de acesso" value={store.loginEmail || "—"} />
        </Box>
      </CardContent>
    </Card>
  );
}

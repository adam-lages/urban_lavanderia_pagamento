import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { VOUCHER_CATEGORIES, type Customer, type Kind, type Store, type VoucherCategory } from "../../api";
import { Check, OptionalInt } from "../coupons/fields";
import { MoneyField } from "../stores/pricing/MoneyField";
import { STORE_FIELDS_GRID, StoreSection } from "../stores/StoreFieldsLayout";
import type { VoucherDraft } from "./draft";

interface Props {
  draft: VoucherDraft;
  stores: Store[];
  customers: Customer[];
  disabled?: boolean;
  onChange: (patch: Partial<VoucherDraft>) => void;
}

export function VoucherFields({ draft: d, stores, customers, disabled, onChange }: Props) {
  return (
    <Box sx={STORE_FIELDS_GRID}>
      <StoreSection title="Cadastro" />
      <TextField select label="Franqueador" value={d.storeId} required disabled={disabled} onChange={(e) => onChange({ storeId: e.target.value, customerId: "" })} slotProps={{ htmlInput: { "aria-label": "Franqueador" } }}>
        <MenuItem value="" disabled>Selecione</MenuItem>
        {stores.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
      </TextField>
      <TextField select label="Categorias de Vouchers" value={d.category} required disabled={disabled} onChange={(e) => onChange({ category: e.target.value as VoucherCategory })} slotProps={{ htmlInput: { "aria-label": "Categoria" } }}>
        <MenuItem value="" disabled>Selecione</MenuItem>
        {VOUCHER_CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
      </TextField>
      <MoneyField label="R$ Valor" cents={d.amountCents} onCents={(amountCents) => onChange({ amountCents })} disabled={disabled} required sx={{ gridColumn: "1 / -1" }} />
      <Box sx={{ gridColumn: "1 / -1" }}>
        <Check aria="Voucher recorrente" disabled={disabled} checked={d.recurring} onChange={(recurring) => onChange({ recurring })} label="Tornar esse voucher Recorrente" />
      </Box>
      <TextField label="Período de Validade - Inicial" type="date" value={d.validFrom} disabled={disabled} onChange={(e) => onChange({ validFrom: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": "Período de Validade - Inicial" } }} />
      <TextField label="Período de Validade - Final" type="date" value={d.validTo} disabled={disabled} onChange={(e) => onChange({ validTo: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": "Período de Validade - Final" } }} />
      <StoreSection title="Marque as opções abaixo para restringir o voucher a grupos específicos" />
      <Group title="Lavanderia" checked={d.restrictStore} disabled={disabled} onCheck={(restrictStore) => onChange({ restrictStore })}>
        <MoneyField label="R$ Limite de Valor por Lavanderia" cents={d.storeValueLimitCents ?? 0} onCents={(v) => onChange({ storeValueLimitCents: v || null })} disabled={disabled || !d.restrictStore} />
        <OptionalInt label="Limite de uso por Lavanderia" value={d.storeUsageLimit} onChange={(storeUsageLimit) => onChange({ storeUsageLimit })} disabled={disabled || !d.restrictStore} />
        <TextField select label="Lavanderia" value={d.restrictStoreId} disabled={disabled || !d.restrictStore} onChange={(e) => onChange({ restrictStoreId: e.target.value })} slotProps={{ htmlInput: { "aria-label": "Lavanderia da restrição" } }}>
          <MenuItem value="">Selecione</MenuItem>
          {stores.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
      </Group>
      <Group title="Cliente" checked={d.restrictCustomer} disabled={disabled} onCheck={(restrictCustomer) => onChange({ restrictCustomer })}>
        <MoneyField label="R$ Limite de Valor por Cliente" cents={d.customerValueLimitCents ?? 0} onCents={(v) => onChange({ customerValueLimitCents: v || null })} disabled={disabled || !d.restrictCustomer} />
        <OptionalInt label="Limite de uso por Cliente" value={d.customerUsageLimit} onChange={(customerUsageLimit) => onChange({ customerUsageLimit })} disabled={disabled || !d.restrictCustomer} />
        <TextField select label="Cliente" value={d.customerId} disabled={disabled || !d.restrictCustomer} onChange={(e) => onChange({ customerId: e.target.value })} slotProps={{ htmlInput: { "aria-label": "Cliente" } }}>
          <MenuItem value="">Todos</MenuItem>
          {customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
      </Group>
      <Group title="Serviço" checked={d.restrictService} disabled={disabled} onCheck={(restrictService) => onChange({ restrictService })}>
        <MoneyField label="R$ Limite de Valor por Serviço" cents={d.serviceValueLimitCents ?? 0} onCents={(v) => onChange({ serviceValueLimitCents: v || null })} disabled={disabled || !d.restrictService} />
        <OptionalInt label="Limite de uso por Serviço" value={d.serviceUsageLimit} onChange={(serviceUsageLimit) => onChange({ serviceUsageLimit })} disabled={disabled || !d.restrictService} />
        <TextField select label="Serviço" value={d.service} disabled={disabled || !d.restrictService} onChange={(e) => onChange({ service: e.target.value as Kind | "" })} slotProps={{ htmlInput: { "aria-label": "Serviço" } }}>
          <MenuItem value="">Selecione</MenuItem>
          <MenuItem value="WASHER">Lavagem</MenuItem>
          <MenuItem value="DRYER">Secagem</MenuItem>
        </TextField>
      </Group>
    </Box>
  );
}

function Group({ title, checked, onCheck, disabled, children }: {
  title: string; checked: boolean; onCheck: (v: boolean) => void; disabled?: boolean; children: ReactNode;
}) {
  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Check aria={title} disabled={disabled} checked={checked} onChange={onCheck} label={<Typography variant="subtitle2">{title}</Typography>} />
      {children}
    </Box>
  );
}

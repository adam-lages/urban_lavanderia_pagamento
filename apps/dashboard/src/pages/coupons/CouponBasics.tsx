import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { WEEKDAYS, type Customer, type Kind, type Store } from "../../api";
import { MoneyField } from "../stores/pricing/MoneyField";
import { STORE_FIELDS_GRID, StoreSection } from "../stores/StoreFieldsLayout";
import type { CouponDraft } from "./draft";
import { Check, OptionalInt } from "./fields";

const SERVICES: Array<{ value: Kind; label: string }> = [
  { value: "WASHER", label: "Lavagem" },
  { value: "DRYER", label: "Secagem" },
];

interface Props {
  draft: CouponDraft;
  stores: Store[];
  customers: Customer[];
  disabled?: boolean;
  onChange: (patch: Partial<CouponDraft>) => void;
}

export function CouponBasics({ draft: d, stores, customers, disabled, onChange }: Props) {
  const franchiseStores = stores.filter((s) => s.role === "FRANQUIA");
  const storeOptions = d.allFranchiseStores ? franchiseStores : stores;
  const storeLabel = d.allFranchiseStores ? "Franqueador" : "Lavanderia";
  return (
    <Box sx={STORE_FIELDS_GRID}>
      <StoreSection title="Cadastro" />
      <Box sx={{ gridColumn: "1 / -1" }}>
        <Check
          aria="Usar em todas as lavanderias da franquia"
          disabled={disabled}
          checked={d.allFranchiseStores}
          onChange={(v) => onChange({ allFranchiseStores: v, storeId: "" })}
          label="Marque essa opção para selecionar um Franqueador e permitir o uso do cupom por todas as lavanderias dele"
        />
      </Box>
      <TextField
        select
        label={storeLabel}
        value={d.storeId}
        disabled={disabled}
        onChange={(e) => onChange({ storeId: e.target.value })}
        required
        sx={{ gridColumn: "1 / -1" }}
        slotProps={{ htmlInput: { "aria-label": storeLabel } }}
      >
        <MenuItem value="" disabled>Selecione</MenuItem>
        {storeOptions.map((s) => (
          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
        ))}
      </TextField>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <Check aria="Código gerado" disabled={disabled} checked={d.generated} onChange={(v) => onChange({ generated: v })} label="Código Gerado" />
        <TextField
          label="Código"
          value={d.code}
          required
          disabled={disabled || d.generated}
          onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
          slotProps={{ htmlInput: { "aria-label": "Código", readOnly: disabled || d.generated } }}
        />
      </Box>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <Check aria="Percentual" disabled={disabled} checked={d.percent} onChange={(v) => onChange({ percent: v, amount: 0 })} label="Percentual" />
        {d.percent ? (
          <TextField
            label="Percentual"
            value={d.amount || ""}
            disabled={disabled}
            onChange={(e) => onChange({ amount: Number(e.target.value.replace(/\D/g, "").slice(0, 3) || 0) })}
            slotProps={{ htmlInput: { "aria-label": "Percentual", inputMode: "numeric" }, input: { endAdornment: "%" } }}
          />
        ) : (
          <MoneyField label="R$ Valor Monetário" cents={d.amount} onCents={(amount) => onChange({ amount })} disabled={disabled} />
        )}
      </Box>
      <MoneyField label="R$ Limite de Valor" cents={d.valueLimitCents ?? 0} onCents={(v) => onChange({ valueLimitCents: v || null })} disabled={disabled} />
      <OptionalInt label="Limite de uso" value={d.usageLimit} onChange={(usageLimit) => onChange({ usageLimit })} disabled={disabled} />
      <TextField
        label="Período de Validade - Inicial"
        type="date"
        value={d.validFrom}
        disabled={disabled}
        onChange={(e) => onChange({ validFrom: e.target.value })}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": "Período de Validade - Inicial" } }}
      />
      <TextField
        label="Período de Validade - Final"
        type="date"
        value={d.validTo}
        disabled={disabled}
        onChange={(e) => onChange({ validTo: e.target.value })}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": "Período de Validade - Final" } }}
      />
      <Box sx={{ gridColumn: "1 / -1" }}>
        <Check
          aria="Restringir horário"
          disabled={disabled}
          checked={d.restrictHours}
          onChange={(v) => onChange({ restrictHours: v })}
          label="Restringir utilização do cupom para faixa de horário"
        />
      </Box>
      {d.restrictHours && (
        <>
          <TextField label="Horário inicial" type="time" value={d.hourStart} disabled={disabled} onChange={(e) => onChange({ hourStart: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": "Horário inicial" } }} />
          <TextField label="Horário final" type="time" value={d.hourEnd} disabled={disabled} onChange={(e) => onChange({ hourEnd: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": "Horário final" } }} />
        </>
      )}
      <StoreSection title="Marque as opções abaixo para restringir o cupom a grupos específicos" />
      <RestrictCol title="Dia da Semana" checked={d.restrictWeekday} disabled={disabled} onCheck={(restrictWeekday) => onChange({ restrictWeekday })}>
        <MoneyField label="R$ Limite de Valor por Dia da Semana" cents={d.weekdayValueLimitCents ?? 0} onCents={(v) => onChange({ weekdayValueLimitCents: v || null })} disabled={disabled || !d.restrictWeekday} />
        <OptionalInt label="Limite de uso por Dia da Semana" value={d.weekdayUsageLimit} onChange={(weekdayUsageLimit) => onChange({ weekdayUsageLimit })} disabled={disabled || !d.restrictWeekday} />
        <TextField select label="Dia da Semana" value={d.weekday ?? ""} disabled={disabled || !d.restrictWeekday} onChange={(e) => onChange({ weekday: e.target.value === "" ? null : Number(e.target.value) })} slotProps={{ htmlInput: { "aria-label": "Dia da Semana" } }}>
          <MenuItem value="">Selecione</MenuItem>
          {WEEKDAYS.map((label, i) => <MenuItem key={label} value={i}>{label}</MenuItem>)}
        </TextField>
      </RestrictCol>
      <RestrictCol title="Lavanderia" checked={d.restrictStore} disabled={disabled} onCheck={(restrictStore) => onChange({ restrictStore })}>
        <MoneyField label="R$ Limite de Valor por Lavanderia" cents={d.storeValueLimitCents ?? 0} onCents={(v) => onChange({ storeValueLimitCents: v || null })} disabled={disabled || !d.restrictStore} />
        <OptionalInt label="Limite de uso por Lavanderia" value={d.storeUsageLimit} onChange={(storeUsageLimit) => onChange({ storeUsageLimit })} disabled={disabled || !d.restrictStore} />
        <TextField select label="Lavanderia" value={d.restrictStoreId} disabled={disabled || !d.restrictStore} onChange={(e) => onChange({ restrictStoreId: e.target.value })} slotProps={{ htmlInput: { "aria-label": "Lavanderia da restrição" } }}>
          <MenuItem value="">Selecione</MenuItem>
          {stores.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
      </RestrictCol>
      <RestrictCol title="Cliente" checked={d.restrictCustomer} disabled={disabled} onCheck={(restrictCustomer) => onChange({ restrictCustomer })}>
        <MoneyField label="R$ Limite de Valor por Cliente" cents={d.customerValueLimitCents ?? 0} onCents={(v) => onChange({ customerValueLimitCents: v || null })} disabled={disabled || !d.restrictCustomer} />
        <OptionalInt label="Limite de uso por Cliente" value={d.customerUsageLimit} onChange={(customerUsageLimit) => onChange({ customerUsageLimit })} disabled={disabled || !d.restrictCustomer} />
        <TextField select label="Cliente" value={d.customerId} disabled={disabled || !d.restrictCustomer} onChange={(e) => onChange({ customerId: e.target.value })} slotProps={{ htmlInput: { "aria-label": "Cliente" } }}>
          <MenuItem value="">Todos</MenuItem>
          {customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
      </RestrictCol>
      <RestrictCol title="Serviço" checked={d.restrictService} disabled={disabled} onCheck={(restrictService) => onChange({ restrictService })}>
        <MoneyField label="R$ Limite de Valor por Serviço" cents={d.serviceValueLimitCents ?? 0} onCents={(v) => onChange({ serviceValueLimitCents: v || null })} disabled={disabled || !d.restrictService} />
        <OptionalInt label="Limite de uso por Serviço" value={d.serviceUsageLimit} onChange={(serviceUsageLimit) => onChange({ serviceUsageLimit })} disabled={disabled || !d.restrictService} />
        <TextField select label="Serviço" value={d.service} disabled={disabled || !d.restrictService} onChange={(e) => onChange({ service: e.target.value as Kind | "" })} slotProps={{ htmlInput: { "aria-label": "Serviço" } }}>
          <MenuItem value="">Selecione</MenuItem>
          {SERVICES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
        </TextField>
      </RestrictCol>
      <Check aria="Aniversário" disabled={disabled} checked={d.birthday} onChange={(birthday) => onChange({ birthday })} label="Aniversário" />
      <Check
        aria="Primeira compra"
        disabled={disabled}
        checked={d.firstPurchase}
        onChange={(firstPurchase) => onChange({ firstPurchase })}
        label={(
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            Primeira Compra
            <Tooltip title="Válido apenas na primeira compra do cliente.">
              <InfoOutlined fontSize="small" color="action" />
            </Tooltip>
          </Box>
        )}
      />
    </Box>
  );
}

function RestrictCol({ title, checked, onCheck, disabled, children }: {
  title: string; checked: boolean; onCheck: (v: boolean) => void; disabled?: boolean; children: ReactNode;
}) {
  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Check aria={title} disabled={disabled} checked={checked} onChange={onCheck} label={<Typography variant="subtitle2">{title}</Typography>} />
      {children}
    </Box>
  );
}

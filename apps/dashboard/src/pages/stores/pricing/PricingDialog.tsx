import AddRounded from "@mui/icons-material/AddRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { api, type MachinePricing, type PriceSchedule } from "../../../api";
import { kindService } from "./format";
import { MoneyField } from "./MoneyField";
import { ScheduleFields } from "./ScheduleFields";

const NEW_SCHEDULE: PriceSchedule = { startTime: "00:00", endTime: "23:59", amountCents: 0, weekdays: [] };

interface Props {
  item: MachinePricing;
  onClose: () => void;
  onSaved: (item: MachinePricing) => void;
}

export function PricingDialog({ item, onClose, onSaved }: Props) {
  const [priceCents, setPriceCents] = useState(item.priceCents ?? 0);
  const [scheduled, setScheduled] = useState(item.schedules.length > 0);
  const [schedules, setSchedules] = useState<PriceSchedule[]>(item.schedules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const active = scheduled ? schedules : [];
  const ready = active.every((s) => s.weekdays.length && s.startTime < s.endTime);

  const update = (i: number, s: PriceSchedule) => setSchedules((cur) => cur.map((x, j) => (j === i ? s : x)));
  const remove = (i: number) => setSchedules((cur) => cur.filter((_, j) => j !== i));
  const add = () => setSchedules((cur) => [...cur, { ...NEW_SCHEDULE, amountCents: priceCents }]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api<MachinePricing>(`/machines/${item.machineId}/pricing`, {
        method: "PUT",
        body: { priceCents, schedules: active },
      });
      onSaved(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Editar preço</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Serviço" value={`${kindService(item.kind)} - ${item.label}`} disabled sx={{ flexGrow: 1 }} />
            <MoneyField label="Valor padrão" cents={priceCents} onCents={setPriceCents} sx={{ width: { sm: 200 } }} />
          </Stack>
          <FormControlLabel
            control={<Checkbox checked={scheduled} onChange={(_, v) => setScheduled(v)} />}
            label="Com valores programados"
          />
          {scheduled && (
            <Stack spacing={2}>
              {schedules.map((s, i) => (
                <ScheduleFields key={i} index={i} schedule={s} onChange={(next) => update(i, next)} onRemove={() => remove(i)} />
              ))}
              <Button variant="outlined" color="inherit" startIcon={<AddRounded />} onClick={add} sx={{ alignSelf: "flex-start" }}>
                Adicionar programação especial
              </Button>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="inherit" disabled={saving || !ready} onClick={() => void save()}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

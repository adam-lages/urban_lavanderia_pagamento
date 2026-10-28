import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { WEEKDAYS, type PriceSchedule } from "../../../api";
import { MoneyField } from "./MoneyField";

interface Props {
  index: number;
  schedule: PriceSchedule;
  onChange: (s: PriceSchedule) => void;
  onRemove: () => void;
}

export function ScheduleFields({ index, schedule: s, onChange, onRemove }: Props) {
  const n = index + 1;
  const toggleDay = (day: number) =>
    onChange({ ...s, weekdays: s.weekdays.includes(day) ? s.weekdays.filter((d) => d !== day) : [...s.weekdays, day].sort() });
  return (
    <Box sx={{ display: "flex", flexWrap: { xs: "wrap", md: "nowrap" }, gap: 1.5, alignItems: "center" }}>
      <TextField
        type="time"
        size="small"
        label="Hr inicial"
        value={s.startTime}
        onChange={(e) => onChange({ ...s, startTime: e.target.value })}
        sx={{ width: 120, flexShrink: 0 }}
        slotProps={{ htmlInput: { "aria-label": `Hora inicial ${n}` }, inputLabel: { shrink: true } }}
      />
      <TextField
        type="time"
        size="small"
        label="Hr final"
        value={s.endTime}
        onChange={(e) => onChange({ ...s, endTime: e.target.value })}
        sx={{ width: 120, flexShrink: 0 }}
        slotProps={{ htmlInput: { "aria-label": `Hora final ${n}` }, inputLabel: { shrink: true } }}
      />
      <MoneyField size="small" label={`Valor ${n}`} cents={s.amountCents} onCents={(amountCents) => onChange({ ...s, amountCents })} sx={{ width: 120, flexShrink: 0 }} />
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: { xs: "wrap", md: "nowrap" }, flexGrow: 1 }} role="group" aria-label={`Dias da programação ${n}`}>
        {WEEKDAYS.map((label, day) => {
          const on = s.weekdays.includes(day);
          return (
            <Chip
              key={label}
              label={label}
              size="small"
              clickable
              color={on ? "secondary" : "default"}
              variant={on ? "filled" : "outlined"}
              aria-pressed={on}
              sx={{ width: 54, flexShrink: 0 }}
              onClick={() => toggleDay(day)}
            />
          );
        })}
      </Stack>
      <IconButton color="error" sx={{ ml: "auto" }} aria-label={`Remover programação ${n}`} onClick={onRemove}>
        <DeleteOutlineRounded />
      </IconButton>
    </Box>
  );
}

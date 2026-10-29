import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import type { ReactNode } from "react";

export function Check({
  label, checked, onChange, disabled, aria,
}: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; aria: string }) {
  return (
    <FormControlLabel
      sx={{ alignItems: "center", mr: 0 }}
      control={(
        <Checkbox
          checked={checked}
          disabled={disabled}
          onChange={(_, v) => onChange(v)}
          slotProps={{ input: { "aria-label": aria } }}
        />
      )}
      label={label}
    />
  );
}

export function OptionalInt({
  label, value, onChange, disabled,
}: { label: string; value: number | null; onChange: (v: number | null) => void; disabled?: boolean }) {
  return (
    <TextField
      label={label}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, "").slice(0, 7);
        onChange(d ? Number(d) : null);
      }}
      slotProps={{ htmlInput: { "aria-label": label, inputMode: "numeric", readOnly: disabled } }}
    />
  );
}

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

interface Props {
  label: string;
  value: string;
  defaultValue: string;
  custom: boolean;
  maxDigits: number;
  helperText: string;
  unit?: string;
  onChange: (v: string) => void;
  onCustom: (custom: boolean) => void;
}

export function DefaultableField({ label, value, defaultValue, custom, maxDigits, helperText, unit, onChange, onCustom }: Props) {
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
      <TextField
        label={label}
        value={custom ? value : defaultValue}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, maxDigits))}
        disabled={!custom}
        required
        helperText={helperText}
        slotProps={{
          htmlInput: { "aria-label": label, inputMode: "numeric" },
          input: unit ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } : undefined,
        }}
      />
      <FormControlLabel
        sx={{ mt: 1, mr: 0, whiteSpace: "nowrap" }}
        control={
          <Checkbox
            checked={custom}
            onChange={(_, v) => {
              onCustom(v);
              if (!v) onChange(defaultValue);
            }}
            slotProps={{ input: { "aria-label": `Alterar ${label.toLowerCase()}` } }}
          />
        }
        label="Alterar"
      />
    </Box>
  );
}

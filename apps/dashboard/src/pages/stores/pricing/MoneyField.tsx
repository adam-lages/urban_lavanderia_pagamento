import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { brl } from "../../../api";

type Props = Omit<TextFieldProps, "value" | "onChange"> & {
  cents: number;
  onCents: (cents: number) => void;
};

export function MoneyField({ cents, onCents, label, ...rest }: Props) {
  return (
    <TextField
      {...rest}
      label={label}
      value={brl(cents)}
      onChange={(e) => onCents(Number(e.target.value.replace(/\D/g, "").slice(0, 7) || 0))}
      slotProps={{ htmlInput: { "aria-label": String(label), inputMode: "numeric" } }}
    />
  );
}

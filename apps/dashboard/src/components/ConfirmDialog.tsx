import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import type { ReactNode } from "react";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmIcon?: ReactNode;
  cancelIcon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmIcon,
  cancelIcon,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open onClose={onCancel} aria-labelledby="confirm-title" fullWidth maxWidth="xs">
      <DialogTitle id="confirm-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" startIcon={cancelIcon} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="contained" startIcon={confirmIcon} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

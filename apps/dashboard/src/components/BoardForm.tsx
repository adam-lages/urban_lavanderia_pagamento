import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { api, type Board, type Kind } from "../api";
import { useStores } from "../hooks";

interface Props {
  board: Board;
  onSaved: () => void;
  onCancel: () => void;
}

export function BoardForm({ board, onSaved, onCancel }: Props) {
  const { stores } = useStores();
  const [name, setName] = useState(board.name ?? "");
  const [storeId, setStoreId] = useState(board.storeId ?? "");
  const [kind, setKind] = useState<Kind | "">(board.kind ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/boards/${board.deviceId}`, {
        method: "PATCH",
        body: { name: name.trim() || undefined, storeId: storeId || undefined, kind: kind || undefined },
      });
      setError("");
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onCancel} fullWidth maxWidth="sm" aria-labelledby="board-form-title">
      <DialogTitle id="board-form-title">{board.registered ? "Editar máquina" : "Cadastrar máquina"}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField label="Placa" value={board.deviceId} disabled />
          <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Lavadora 3" />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField select label="Loja" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <MenuItem value="">Escolha…</MenuItem>
              {stores.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Tipo" value={kind} onChange={(e) => setKind(e.target.value as Kind | "")}>
              <MenuItem value="">Escolha…</MenuItem>
              <MenuItem value="WASHER">Lava</MenuItem>
              <MenuItem value="DRYER">Seca</MenuItem>
            </TextField>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="contained" color="inherit" disabled={saving} onClick={() => void save()}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

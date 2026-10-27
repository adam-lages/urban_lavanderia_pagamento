import CloseRounded from "@mui/icons-material/CloseRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { api, type Command, type Machine } from "../../api";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyContent } from "../../components/EmptyContent";
import { LoadingCenter } from "../../components/TableLoading";
import { canRelease, MachineCard, releaseHint } from "./MachineCard";

function MachineGroup({ title, items, onRelease, onToggleBlock }: {
  title: string;
  items: Machine[];
  onRelease: (m: Machine) => void;
  onToggleBlock: (m: Machine) => void;
}) {
  if (!items.length) return null;
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>{title}</Typography>
      <Grid container spacing={2}>
        {items.map((m) => (
          <Grid key={m.id} size={{ xs: 12, sm: 6 }}>
            <MachineCard machine={m} onRelease={() => onRelease(m)} onToggleBlock={() => onToggleBlock(m)} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export function StoreMachines({ storeId }: { storeId: string }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Machine | null>(null);

  const load = useCallback((showSpinner = false) => {
    if (showSpinner) setLoading(true);
    api<Machine[]>(`/machines?storeId=${encodeURIComponent(storeId)}`)
      .then((rows) => {
        setMachines(rows);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => {
    load(true);
    const t = setInterval(() => load(false), 3000);
    return () => clearInterval(t);
  }, [load]);

  const toggleBlock = async (m: Machine) => {
    try {
      await api(`/machines/${m.id}`, { method: "PATCH", body: { blocked: !m.blocked } });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const release = async (m: Machine) => {
    if (!canRelease(m)) {
      setError(releaseHint(m));
      return;
    }
    try {
      await api<Command>(`/boards/${m.deviceId}/release`, { method: "POST" });
      setError("");
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const washers = machines.filter((m) => m.kind === "WASHER");
  const dryers = machines.filter((m) => m.kind === "DRYER");

  return (
    <Stack spacing={4}>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <LoadingCenter />}
      {!loading && !machines.length && (
        <EmptyContent title="Nenhuma máquina nesta lavanderia" description="Cadastre a placa na tela Máquinas e vincule a esta loja." />
      )}
      <MachineGroup title="Lavadoras" items={washers} onRelease={setPending} onToggleBlock={(m) => void toggleBlock(m)} />
      <MachineGroup title="Secadoras" items={dryers} onRelease={setPending} onToggleBlock={(m) => void toggleBlock(m)} />
      {pending && (
        <ConfirmDialog
          title="Liberar máquina"
          message={`Deseja realmente liberar a ${pending.label}? Esta ação inicia o ciclo agora.`}
          confirmLabel="Liberar"
          cancelLabel="Cancelar"
          confirmIcon={<PlayArrowRounded />}
          cancelIcon={<CloseRounded />}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const m = pending;
            setPending(null);
            void release(m);
          }}
        />
      )}
    </Stack>
  );
}

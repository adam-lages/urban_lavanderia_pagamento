import AddRounded from "@mui/icons-material/AddRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Command, type Machine } from "../../api";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyContent } from "../../components/EmptyContent";
import { TableLoading } from "../../components/TableLoading";
import { canRelease, releaseHint } from "../machines/MachineActions";
import { MachineRow } from "../machines/MachineRow";

export function StoreMachinesTable({ storeId }: { storeId: string }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Machine | null>(null);

  const load = useCallback(() => {
    api<Machine[]>(`/machines?storeId=${encodeURIComponent(storeId)}`)
      .then((rows) => {
        setItems(rows);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
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

  const q = search.trim().toLowerCase();
  const filtered = q ? items.filter((m) => [m.label, m.code].some((v) => v.toLowerCase().includes(q))) : items;
  const visible = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <Stack direction="row" spacing={2} sx={{ p: 2.5, alignItems: "center", justifyContent: "space-between" }}>
          <TextField
            size="small"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar por nome ou código…"
            sx={{ width: { xs: 1, sm: "50%" } }}
            slotProps={{
              htmlInput: { "aria-label": "Buscar máquina" },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded sx={{ color: "text.disabled" }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button variant="contained" color="inherit" startIcon={<AddRounded />} sx={{ flexShrink: 0, whiteSpace: "nowrap" }} onClick={() => navigate(`/lavanderias/${storeId}/maquinas/nova`)}>
            Nova máquina
          </Button>
        </Stack>
        <TableLoading loading={loading}>
          <TableContainer>
            <Table sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Máquina</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Última liberação</TableCell>
                  <TableCell>Último bloqueio</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((m) => (
                  <MachineRow
                    key={m.id}
                    machine={m}
                    onDetails={() => navigate(`/lavanderias/${storeId}/maquinas/${m.id}`)}
                    onRelease={() => setPending(m)}
                    onToggleBlock={() => void toggleBlock(m)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TableLoading>
        {!loading && !filtered.length && (
          <Box sx={{ p: 2.5 }}>
            <EmptyContent
              title={items.length ? "Nenhuma máquina encontrada" : "Nenhuma máquina nesta lavanderia"}
              description={items.length ? "Ajuste a busca." : "Clique em Nova máquina para cadastrar a primeira."}
            />
          </Box>
        )}
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </Card>
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
    </>
  );
}

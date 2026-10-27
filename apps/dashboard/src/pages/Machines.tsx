import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Board, type Command } from "../api";
import { BoardForm } from "../components/BoardForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyContent } from "../components/EmptyContent";
import { PageHeader } from "../components/PageHeader";
import { displayName, FINAL_STATES, type CommandDetail } from "./machines/format";
import { MachineRow } from "./machines/MachineRow";
import { MachinesToolbar, type MachineFilter } from "./machines/MachinesToolbar";

const HEAD = ["Máquina", "Tipo", "Loja", "Conexão", "Última vez visto", "Última liberação", ""];

function matches(b: Board, filter: MachineFilter, search: string) {
  if (filter === "online" && !b.online) return false;
  if (filter === "offline" && b.online) return false;
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [b.name, b.deviceId, b.storeName].some((v) => v?.toLowerCase().includes(q));
}

export function Machines() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Board | null>(null);
  const [active, setActive] = useState<Record<string, CommandDetail>>({});
  const [logOf, setLogOf] = useState<string | null>(null);
  const [pending, setPending] = useState<Board | null>(null);
  const [filter, setFilter] = useState<MachineFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = useCallback(() => {
    api<Board[]>("/boards")
      .then((r) => {
        setBoards(r);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const track = useCallback(
    (deviceId: string, commandId: string) => {
      const poll = async () => {
        const d = await api<CommandDetail>(`/commands/${commandId}`);
        setActive((a) => ({ ...a, [deviceId]: d }));
        if (!FINAL_STATES.includes(d.status)) setTimeout(() => void poll().catch(() => undefined), 1000);
        else load();
      };
      void poll().catch((e) => setError(e.message));
    },
    [load],
  );

  const release = async (b: Board) => {
    try {
      const cmd = await api<Command>(`/boards/${b.deviceId}/release`, { method: "POST" });
      setError("");
      track(b.deviceId, cmd.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const counts = useMemo(() => {
    const online = boards.filter((b) => b.online).length;
    return { all: boards.length, online, offline: boards.length - online };
  }, [boards]);
  const filtered = useMemo(() => boards.filter((b) => matches(b, filter, search)), [boards, filter, search]);
  const visible = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <PageHeader title="Máquinas" description="Lavadoras e secadoras detectadas. A lista atualiza a cada 3 segundos." />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <MachinesToolbar
          filter={filter}
          counts={counts}
          search={search}
          onFilter={(f) => { setFilter(f); setPage(0); }}
          onSearch={(s) => { setSearch(s); setPage(0); }}
        />
        <TableContainer>
          <Table sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow>
                {HEAD.map((h, i) => <TableCell key={i}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((b) => (
                <MachineRow
                  key={b.deviceId}
                  board={b}
                  command={active[b.deviceId]}
                  showLog={logOf === b.deviceId}
                  onRelease={() => setPending(b)}
                  onEdit={() => setEditing(b)}
                  onToggleLog={() => setLogOf(logOf === b.deviceId ? null : b.deviceId)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {!filtered.length && (
          <Box sx={{ p: 2.5 }}>
            <EmptyContent
              title={boards.length ? "Nenhuma máquina encontrada" : "Nenhuma placa detectada ainda"}
              description={boards.length ? "Ajuste a busca ou o filtro." : "Ligue a ESP32 com o firmware gravado."}
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
      {editing && (
        <BoardForm
          board={editing}
          onSaved={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
        />
      )}
      {pending && (
        <ConfirmDialog
          title="Liberar máquina"
          message={`Liberar a máquina "${displayName(pending)}" agora? A placa vai acionar a máquina uma vez.`}
          confirmLabel="Liberar"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const b = pending;
            setPending(null);
            void release(b);
          }}
        />
      )}
    </>
  );
}

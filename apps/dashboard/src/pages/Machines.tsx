import AddRounded from "@mui/icons-material/AddRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Machine } from "../api";
import { EmptyContent } from "../components/EmptyContent";
import { PageHeader } from "../components/PageHeader";
import { TableLoading } from "../components/TableLoading";
import { useStores } from "../hooks";
import { MachineRow } from "./machines/MachineRow";
import { MachinesToolbar, type MachineFilter } from "./machines/MachinesToolbar";

function matches(m: Machine, filter: MachineFilter) {
  if (filter === "online") return m.status === "ONLINE" || m.status === "IN_USE";
  if (filter === "offline") return m.status === "OFFLINE";
  if (filter === "blocked") return m.blocked;
  return true;
}

export function Machines() {
  const navigate = useNavigate();
  const { stores } = useStores();
  const [storeId, setStoreId] = useState("");
  const [items, setItems] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<MachineFilter>("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = useCallback((showSpinner = false) => {
    if (!storeId) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (showSpinner) setLoading(true);
    api<Machine[]>(`/machines?storeId=${encodeURIComponent(storeId)}`)
      .then((rows) => {
        setItems(rows);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => {
    load(true);
    if (!storeId) return;
    const t = setInterval(() => load(false), 3000);
    return () => clearInterval(t);
  }, [load, storeId]);

  const counts = useMemo(() => ({
    all: items.length,
    online: items.filter((m) => m.status === "ONLINE" || m.status === "IN_USE").length,
    offline: items.filter((m) => m.status === "OFFLINE").length,
    blocked: items.filter((m) => m.blocked).length,
  }), [items]);
  const filtered = useMemo(() => items.filter((m) => matches(m, filter)), [items, filter]);
  const visible = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <PageHeader
        title="Máquinas"
        action={
          <Button
            variant="contained"
            color="inherit"
            startIcon={<AddRounded />}
            onClick={() => navigate(storeId ? `/maquinas/nova?storeId=${storeId}` : "/maquinas/nova")}
          >
            Nova máquina
          </Button>
        }
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <MachinesToolbar
          stores={stores}
          storeId={storeId}
          filter={filter}
          counts={counts}
          onStore={(id) => { setStoreId(id); setFilter("all"); setPage(0); }}
          onFilter={(f) => { setFilter(f); setPage(0); }}
        />
        <TableLoading loading={loading}>
        <TableContainer>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>Máquina</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Última liberação</TableCell>
                <TableCell>Último bloqueio</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((m) => (
                <MachineRow key={m.id} machine={m} onDetails={() => navigate(`/maquinas/${m.id}`)} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </TableLoading>
        {!loading && !filtered.length && (
          <Box sx={{ p: 2.5 }}>
            <EmptyContent
              title={!storeId ? "Selecione uma lavanderia" : "Nenhuma máquina encontrada"}
              description={!storeId ? "Escolha a unidade no filtro para listar as máquinas cadastradas." : "Cadastre uma máquina nesta lavanderia."}
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
    </>
  );
}

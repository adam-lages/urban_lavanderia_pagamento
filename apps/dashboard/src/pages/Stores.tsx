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
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Store } from "../api";
import { DetailsButton } from "../components/DetailsButton";
import { EmptyContent } from "../components/EmptyContent";
import { Label } from "../components/Label";
import { PageHeader } from "../components/PageHeader";
import { TableLoading } from "../components/TableLoading";
import { useStores } from "../hooks";
import { countByRole, storesOfRole, type StoreFilter } from "../components/StoreRoleTabs";
import { StoresToolbar } from "./stores/StoresToolbar";
import { formatCnpj, roleLabel } from "./stores/format";

function matches(store: Store, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [store.name, store.code, store.cnpj, formatCnpj(store.cnpj)].some((v) => v.toLowerCase().includes(q));
}

export function Stores() {
  const { stores, error, loading } = useStores();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StoreFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const counts = useMemo(() => countByRole(stores), [stores]);
  const filtered = useMemo(
    () => storesOfRole(stores, filter).filter((s) => matches(s, search)),
    [stores, filter, search],
  );
  const visible = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <PageHeader
        title="Lavanderias"
        action={
          <Button variant="contained" color="inherit" startIcon={<AddRounded />} onClick={() => navigate("/lavanderias/nova")}>
            Nova lavanderia
          </Button>
        }
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <StoresToolbar
          filter={filter}
          counts={counts}
          search={search}
          onFilter={(f) => { setFilter(f); setPage(0); }}
          onSearch={(v) => { setSearch(v); setPage(0); }}
        />
        <TableLoading loading={loading}>
        <TableContainer>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>Nome fantasia</TableCell>
                <TableCell>CNPJ</TableCell>
                <TableCell>Código</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((store) => (
                <TableRow key={store.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/lavanderias/${store.id}`)}>
                  <TableCell>
                    <Typography variant="subtitle2">{store.name}</Typography>
                  </TableCell>
                  <TableCell>{formatCnpj(store.cnpj) || "—"}</TableCell>
                  <TableCell>{store.code}</TableCell>
                  <TableCell>
                    <Label color={store.role === "FRANQUIA" ? "info" : "warning"}>{roleLabel(store.role)}</Label>
                  </TableCell>
                  <TableCell align="right">
                    <DetailsButton label={`Detalhes de ${store.name}`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </TableLoading>
        {!loading && !filtered.length && (
          <Box sx={{ p: 2.5 }}>
            <EmptyContent
              title={stores.length ? "Nenhuma lavanderia encontrada" : "Nenhuma lavanderia cadastrada"}
              description={stores.length ? "Ajuste a busca ou o filtro." : "Clique em Nova lavanderia para cadastrar a primeira loja."}
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

import AddRounded from "@mui/icons-material/AddRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Store } from "../api";
import { DetailsButton } from "../components/DetailsButton";
import { EmptyContent } from "../components/EmptyContent";
import { PageHeader } from "../components/PageHeader";
import { TableLoading } from "../components/TableLoading";
import { useStores } from "../hooks";

function matches(store: Store, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [store.name, store.address, store.code].some((v) => v.toLowerCase().includes(q));
}

export function Stores() {
  const { stores, error, loading } = useStores();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const filtered = useMemo(() => stores.filter((s) => matches(s, search)), [stores, search]);
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
        <Box sx={{ p: 2.5 }}>
          <TextField
            size="small"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar por nome ou endereço…"
            slotProps={{
              htmlInput: { "aria-label": "Buscar lavanderia" },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded sx={{ color: "text.disabled" }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        <TableLoading loading={loading}>
        <TableContainer>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Endereço</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((store) => (
                <TableRow key={store.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/lavanderias/${store.id}`)}>
                  <TableCell>
                    <Typography variant="subtitle2">{store.name}</Typography>
                    <Typography variant="caption" color="text.disabled">
                      {store.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{store.address || "—"}</TableCell>
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
              description={stores.length ? "Ajuste a busca." : "Clique em Nova lavanderia para cadastrar a primeira loja."}
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

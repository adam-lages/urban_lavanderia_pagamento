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
import { useNavigate } from "react-router-dom";
import { api, type Customer, type CustomerPage } from "../api";
import { EmptyContent } from "../components/EmptyContent";
import { PageHeader } from "../components/PageHeader";
import { countByRole, StoreRoleTabs, storesOfRole, type StoreFilter } from "../components/StoreRoleTabs";
import { TableLoading } from "../components/TableLoading";
import { useStores } from "../hooks";
import { ClientRow } from "./clients/ClientRow";
import { ClientsToolbar } from "./clients/ClientsToolbar";
import { customersCsv, downloadCsv } from "./clients/format";

const NO_FILTER = { storeId: "", name: "", cpf: "" };

export function Clients() {
  const navigate = useNavigate();
  const { stores } = useStores();
  const [role, setRole] = useState<StoreFilter>("FRANQUIA");
  const [storeId, setStoreId] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [query, setQuery] = useState(NO_FILTER);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const counts = useMemo(() => countByRole(stores), [stores]);
  const roleStores = useMemo(() => storesOfRole(stores, role), [stores, role]);

  const search = () => {
    setQuery({ storeId, name, cpf });
    setPage(0);
  };

  const clearFilters = () => {
    setStoreId("");
    setName("");
    setCpf("");
    setQuery(NO_FILTER);
    setPage(0);
  };

  const changeRole = (r: StoreFilter) => {
    setRole(r);
    clearFilters();
  };

  const load = useCallback(() => {
    if (!query.storeId) {
      setItems([]);
      setTotal(0);
      return;
    }
    const params = new URLSearchParams({
      ...query,
      page: String(page),
      limit: String(rowsPerPage),
    });
    setLoading(true);
    api<CustomerPage>(`/customers?${params}`)
      .then((data) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  const exportSheet = async () => {
    try {
      const params = new URLSearchParams({ ...query, page: "0", limit: "100" });
      const data = await api<CustomerPage>(`/customers?${params}`);
      downloadCsv("clientes.csv", customersCsv(data.items));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader title="Clientes" />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <StoreRoleTabs value={role} counts={counts} onChange={changeRole} withAll={false} />
        <ClientsToolbar
          stores={roleStores}
          storeId={storeId}
          name={name}
          cpf={cpf}
          onStore={setStoreId}
          onName={setName}
          onCpf={setCpf}
          onSearch={search}
          onClear={clearFilters}
          exportDisabled={!query.storeId}
          onExport={() => void exportSheet()}
        />
        <TableLoading loading={loading}>
        <TableContainer>
          <Table sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>CPF</TableCell>
                <TableCell>Celular</TableCell>
                <TableCell>Data Cadastro</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((c) => (
                <ClientRow key={c.id} customer={c} onDetails={() => navigate(`/clientes/${c.id}`)} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </TableLoading>
        {!loading && !items.length && (
          <Box sx={{ p: 2.5 }}>
            <EmptyContent
              title={query.storeId ? "Nenhum cliente encontrado" : "Selecione uma lavanderia"}
              description={query.storeId ? "Ajuste a lavanderia, o nome ou o CPF." : "Escolha a unidade e clique em Pesquisar para listar os clientes."}
            />
          </Box>
        )}
        <TablePagination
          component="div"
          count={total}
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

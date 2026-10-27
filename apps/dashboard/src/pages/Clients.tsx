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
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Customer, type CustomerPage } from "../api";
import { EmptyContent } from "../components/EmptyContent";
import { PageHeader } from "../components/PageHeader";
import { useStores } from "../hooks";
import { ClientRow } from "./clients/ClientRow";
import { ClientsToolbar } from "./clients/ClientsToolbar";
import { customersCsv, downloadCsv } from "./clients/format";

const NO_FILTER = { storeId: "", name: "", cpf: "" };

export function Clients() {
  const navigate = useNavigate();
  const { stores } = useStores();
  const [storeId, setStoreId] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [query, setQuery] = useState(NO_FILTER);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  const filtered = Boolean(query.storeId || query.name || query.cpf);

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

  const load = useCallback(() => {
    const params = new URLSearchParams({
      ...query,
      page: String(page),
      limit: String(rowsPerPage),
    });
    api<CustomerPage>(`/customers?${params}`)
      .then((data) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setError("");
      })
      .catch((e) => setError(e.message));
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
      <PageHeader title="Listagem de clientes" />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <ClientsToolbar
          stores={stores}
          storeId={storeId}
          name={name}
          cpf={cpf}
          onStore={setStoreId}
          onName={setName}
          onCpf={setCpf}
          onSearch={search}
          onClear={clearFilters}
          onExport={() => void exportSheet()}
        />
        <TableContainer>
          <Table sx={{ minWidth: 880 }}>
            <TableHead>
              <TableRow>
                <TableCell>Unidade</TableCell>
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
        {!items.length && (
          <Box sx={{ p: 2.5 }}>
            <EmptyContent
              title={filtered ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              description={filtered ? "Ajuste a lavanderia, o nome ou o CPF." : "Os clientes da operação vão aparecer aqui."}
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

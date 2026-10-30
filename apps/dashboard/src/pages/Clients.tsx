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
import { downloadExcel } from "../excel";
import { useStores } from "../hooks";
import { ClientRow } from "./clients/ClientRow";
import { ClientsToolbar } from "./clients/ClientsToolbar";
import { customersSheet } from "./clients/format";
import { rangeFor, type PeriodPreset } from "./home/periods";

const emptyQuery = () => ({ storeId: "", name: "", cpf: "", phone: "", ...rangeFor("today") });

function customerParams(query: ReturnType<typeof emptyQuery>, page: number, limit: number) {
  const params = new URLSearchParams({
    storeId: query.storeId,
    from: query.from,
    to: query.to,
    page: String(page),
    limit: String(limit),
  });
  if (query.name) params.set("name", query.name);
  if (query.cpf) params.set("cpf", query.cpf);
  if (query.phone) params.set("phone", query.phone);
  return params;
}

export function Clients() {
  const navigate = useNavigate();
  const { stores } = useStores();
  const [role, setRole] = useState<StoreFilter>("FRANQUIA");
  const [storeId, setStoreId] = useState("");
  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [range, setRange] = useState(() => rangeFor("today"));
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState(emptyQuery);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const counts = useMemo(() => countByRole(stores), [stores]);
  const roleStores = useMemo(() => storesOfRole(stores, role), [stores, role]);

  const changePreset = (next: PeriodPreset) => {
    setPreset(next);
    if (next !== "custom") setRange(rangeFor(next));
  };

  const search = () => {
    setQuery({ storeId, name, cpf, phone, ...range });
    setPage(0);
  };

  const clearFilters = () => {
    const today = rangeFor("today");
    setStoreId("");
    setPreset("today");
    setRange(today);
    setName("");
    setCpf("");
    setPhone("");
    setQuery(emptyQuery());
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
    setLoading(true);
    api<CustomerPage>(`/customers?${customerParams(query, page, rowsPerPage)}`)
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
      const data = await api<CustomerPage>(`/customers?${customerParams(query, 0, 100)}`);
      const sheet = customersSheet(data.items ?? []);
      downloadExcel("clientes.xls", sheet.header, sheet.rows, "Clientes");
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
          preset={preset}
          from={range.from}
          to={range.to}
          name={name}
          cpf={cpf}
          phone={phone}
          onStore={setStoreId}
          onPreset={changePreset}
          onFrom={(v) => setRange((r) => ({ ...r, from: v }))}
          onTo={(v) => setRange((r) => ({ ...r, to: v }))}
          onName={setName}
          onCpf={setCpf}
          onPhone={setPhone}
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
              description={query.storeId ? "Ajuste o período ou os filtros de cliente." : "Escolha a unidade e o período e clique em Pesquisar para listar os clientes."}
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

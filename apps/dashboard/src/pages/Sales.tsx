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
import { api, type Sale, type SalePage } from "../api";
import { EmptyContent } from "../components/EmptyContent";
import { PageHeader } from "../components/PageHeader";
import { countByRole, StoreRoleTabs, storesOfRole, type StoreFilter } from "../components/StoreRoleTabs";
import { TableLoading } from "../components/TableLoading";
import { useStores } from "../hooks";
import { rangeFor, type PeriodPreset } from "./home/periods";
import { downloadExcel, salesSheet } from "./sales/format";
import { SaleDetails } from "./sales/SaleDetails";
import { SaleReceipt } from "./sales/SaleReceipt";
import { SaleRow } from "./sales/SaleRow";
import { SalesToolbar } from "./sales/SalesToolbar";

const emptyQuery = () => ({ storeId: "", customerName: "", customerCpf: "", ...rangeFor("today") });

function salesParams(query: ReturnType<typeof emptyQuery>, page: number, limit: number) {
  const params = new URLSearchParams({
    storeId: query.storeId,
    from: query.from,
    to: query.to,
    page: String(page),
    limit: String(limit),
  });
  if (query.customerName) params.set("customerName", query.customerName);
  if (query.customerCpf) params.set("customerCpf", query.customerCpf);
  return params;
}

export function Sales() {
  const { stores } = useStores();
  const [role, setRole] = useState<StoreFilter>("FRANQUIA");
  const [storeId, setStoreId] = useState("");
  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [range, setRange] = useState(() => rangeFor("today"));
  const [customerName, setCustomerName] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [query, setQuery] = useState(emptyQuery);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [items, setItems] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Sale | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const counts = useMemo(() => countByRole(stores), [stores]);
  const roleStores = useMemo(() => storesOfRole(stores, role), [stores, role]);

  const changePreset = (next: PeriodPreset) => {
    setPreset(next);
    if (next !== "custom") setRange(rangeFor(next));
  };

  const search = () => {
    setQuery({ storeId, customerName, customerCpf, ...range });
    setPage(0);
  };

  const clearFilters = () => {
    const today = rangeFor("today");
    setStoreId("");
    setPreset("today");
    setRange(today);
    setCustomerName("");
    setCustomerCpf("");
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
    const params = salesParams(query, page, rowsPerPage);
    setLoading(true);
    api<SalePage>(`/sales?${params}`)
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
      const data = await api<SalePage>(`/sales?${salesParams(query, 0, 100)}`);
      const sheet = salesSheet(data.items ?? []);
      downloadExcel("vendas.xls", sheet.header, sheet.rows, "Vendas");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader title="Vendas" />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <StoreRoleTabs value={role} counts={counts} onChange={changeRole} withAll={false} />
        <SalesToolbar
          stores={roleStores}
          storeId={storeId}
          preset={preset}
          from={range.from}
          to={range.to}
          customerName={customerName}
          customerCpf={customerCpf}
          onStore={setStoreId}
          onPreset={changePreset}
          onFrom={(v) => setRange((r) => ({ ...r, from: v }))}
          onTo={(v) => setRange((r) => ({ ...r, to: v }))}
          onCustomerName={setCustomerName}
          onCustomerCpf={setCustomerCpf}
          onSearch={search}
          onClear={clearFilters}
          exportDisabled={!query.storeId}
          onExport={() => void exportSheet()}
        />
        <TableLoading loading={loading}>
        <TableContainer>
          <Table sx={{ minWidth: 880 }}>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Data da compra</TableCell>
                <TableCell>Máquina</TableCell>
                <TableCell align="center">Qtd. serviços</TableCell>
                <TableCell>Valor pago</TableCell>
                <TableCell>Método</TableCell>
                <TableCell>Cupom</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((s) => (
                <SaleRow key={s.id} sale={s} onDetails={() => setSelected(s)} onReceipt={() => setReceipt(s)} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </TableLoading>
        {!loading && !items.length && (
          <Box sx={{ p: 2.5 }}>
            <EmptyContent
              title={query.storeId ? "Nenhuma venda encontrada" : "Selecione uma lavanderia"}
              description={query.storeId ? "Ajuste o período ou os filtros de cliente." : "Escolha a unidade e o período e clique em Pesquisar para listar as vendas."}
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
      <SaleDetails sale={selected} onClose={() => setSelected(null)} />
      <SaleReceipt sale={receipt} store={stores.find((st) => st.id === receipt?.storeId)} onClose={() => setReceipt(null)} />
    </>
  );
}

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
import { api, type Sale, type SalePage } from "../api";
import { EmptyContent } from "../components/EmptyContent";
import { PageHeader } from "../components/PageHeader";
import { TableLoading } from "../components/TableLoading";
import { useStores } from "../hooks";
import { SaleDetails } from "./sales/SaleDetails";
import { SaleRow } from "./sales/SaleRow";
import { SalesToolbar } from "./sales/SalesToolbar";

export function Sales() {
  const { stores } = useStores();
  const [storeId, setStoreId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [query, setQuery] = useState({ storeId: "", customerName: "" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [items, setItems] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Sale | null>(null);

  const search = () => {
    setQuery({ storeId, customerName });
    setPage(0);
  };

  const clearFilters = () => {
    setStoreId("");
    setCustomerName("");
    setQuery({ storeId: "", customerName: "" });
    setPage(0);
  };

  const load = useCallback(() => {
    const params = new URLSearchParams({
      storeId: query.storeId,
      customerName: query.customerName,
      page: String(page),
      limit: String(rowsPerPage),
    });
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

  return (
    <>
      <PageHeader title="Vendas" />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <SalesToolbar
          stores={stores}
          storeId={storeId}
          customerName={customerName}
          onStore={setStoreId}
          onCustomerName={setCustomerName}
          onSearch={search}
          onClear={clearFilters}
        />
        <TableLoading loading={loading}>
        <TableContainer>
          <Table sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow>
                <TableCell>Unidade</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Máquina</TableCell>
                <TableCell>Data da compra</TableCell>
                <TableCell>Valor pago</TableCell>
                <TableCell>Método</TableCell>
                <TableCell>Cupom</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((s) => (
                <SaleRow key={s.id} sale={s} onDetails={() => setSelected(s)} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </TableLoading>
        {!loading && !items.length && (
          <Box sx={{ p: 2.5 }}>
            <EmptyContent
              title={query.storeId || query.customerName ? "Nenhuma venda encontrada" : "Nenhuma venda registrada"}
              description={query.storeId || query.customerName ? "Ajuste o filtro de lavanderia ou nome." : "As vendas pagas vão aparecer aqui."}
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
    </>
  );
}

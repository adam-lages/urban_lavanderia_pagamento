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
import { api, type Sale, type SalePage } from "../../api";
import { EmptyContent } from "../../components/EmptyContent";
import { SaleDetails } from "../sales/SaleDetails";
import { PurchaseRow } from "./PurchaseRow";

export function ClientPurchases({ customerId }: { customerId: string }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [items, setItems] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Sale | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({
      customerId,
      page: String(page),
      limit: String(rowsPerPage),
    });
    api<SalePage>(`/sales?${params}`)
      .then((data) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setLoaded(true);
        setError("");
      })
      .catch((e) => { setError(e.message); setLoaded(true); });
  }, [customerId, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      {error && <Alert severity="error" sx={{ m: 2.5, mb: 0 }}>{error}</Alert>}
      <TableContainer>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell>Data e hora da compra</TableCell>
              <TableCell>Máquina</TableCell>
              <TableCell>Valor pago</TableCell>
              <TableCell>MT Pagamento</TableCell>
              <TableCell>Cupom</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((s) => (
              <PurchaseRow key={s.id} sale={s} onDetails={() => setSelected(s)} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {loaded && !items.length && (
        <Box sx={{ p: 2.5 }}>
          <EmptyContent
            title="Nenhuma compra encontrada"
            description="As compras pagas deste cliente vão aparecer aqui."
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
      <SaleDetails sale={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}

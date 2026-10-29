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
import { api, type Coupon, type CouponPage } from "../api";
import { useAuth } from "../auth";
import { EmptyContent } from "../components/EmptyContent";
import { PageHeader } from "../components/PageHeader";
import { countByRole, StoreRoleTabs, storesOfRole, type StoreFilter } from "../components/StoreRoleTabs";
import { TableLoading } from "../components/TableLoading";
import { useStores } from "../hooks";
import { CouponRow } from "./coupons/CouponRow";
import { CouponsToolbar } from "./coupons/CouponsToolbar";
import { couponsCsv, downloadCsv } from "./coupons/format";

const NO_FILTER = { storeId: "", code: "" };

export function Coupons() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { stores } = useStores();
  const [tab, setTab] = useState<StoreFilter>("FRANQUIA");
  const [storeId, setStoreId] = useState("");
  const [code, setCode] = useState("");
  const [query, setQuery] = useState(NO_FILTER);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [items, setItems] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const counts = useMemo(() => countByRole(stores), [stores]);
  const roleStores = useMemo(() => storesOfRole(stores, tab), [stores, tab]);

  const search = () => {
    setQuery({ storeId, code });
    setPage(0);
  };

  const clearFilters = () => {
    setStoreId("");
    setCode("");
    setQuery(NO_FILTER);
    setPage(0);
  };

  const changeRole = (r: StoreFilter) => {
    setTab(r);
    clearFilters();
  };

  const load = useCallback(() => {
    if (!query.storeId) {
      setItems([]);
      setTotal(0);
      return;
    }
    const params = new URLSearchParams({
      storeId: query.storeId,
      code: query.code,
      page: String(page),
      limit: String(rowsPerPage),
    });
    setLoading(true);
    api<CouponPage>(`/coupons?${params}`)
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
      const data = await api<CouponPage>(`/coupons?${params}`);
      downloadCsv("cupons.csv", couponsCsv(data.items));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Cupons"
        action={
          role === "FRANQUIA" ? (
            <Button variant="contained" color="inherit" startIcon={<AddRounded />} onClick={() => navigate("/cupons/novo")}>
              Novo cupom
            </Button>
          ) : undefined
        }
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <StoreRoleTabs value={tab} counts={counts} onChange={changeRole} withAll={false} />
        <CouponsToolbar
          stores={roleStores}
          storeId={storeId}
          code={code}
          onStore={setStoreId}
          onCode={setCode}
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
                <TableCell>Código</TableCell>
                <TableCell>Desconto</TableCell>
                <TableCell>Lavanderia</TableCell>
                <TableCell>Validade</TableCell>
                <TableCell>Limite de uso</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((c) => (
                <CouponRow key={c.id} coupon={c} onDetails={() => navigate(`/cupons/${c.id}`)} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </TableLoading>
        {!loading && !items.length && (
          <Box sx={{ p: 2.5 }}>
            <EmptyContent
              title={query.storeId ? "Nenhum cupom encontrado" : "Selecione uma lavanderia"}
              description={query.storeId ? "Ajuste a lavanderia ou o código." : "Escolha a unidade e clique em Pesquisar para listar os cupons."}
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

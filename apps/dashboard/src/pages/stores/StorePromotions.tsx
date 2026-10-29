import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Coupon, type CouponPage } from "../../api";
import { EmptyContent } from "../../components/EmptyContent";
import { TableLoading } from "../../components/TableLoading";
import { CouponRow } from "../coupons/CouponRow";

export function StorePromotions({ storeId }: { storeId: string }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api<CouponPage>(`/coupons?storeId=${storeId}&page=0&limit=100`)
      .then((data) => { setItems(data.items ?? []); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [storeId]);

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
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
            <EmptyContent title="Nenhuma promoção" description="Esta lavanderia ainda não tem cupons ativos." />
          </Box>
        )}
      </Card>
    </>
  );
}

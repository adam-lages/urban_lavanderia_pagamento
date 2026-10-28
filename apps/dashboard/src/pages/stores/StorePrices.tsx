import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useCallback, useEffect, useState } from "react";
import { api, type MachinePricing } from "../../api";
import { EmptyContent } from "../../components/EmptyContent";
import { TableLoading } from "../../components/TableLoading";
import { PricingDialog } from "./pricing/PricingDialog";
import { PricingRow } from "./pricing/PricingRow";

export function StorePrices({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<MachinePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<MachinePricing | null>(null);

  const load = useCallback(() => {
    api<MachinePricing[]>(`/stores/${encodeURIComponent(storeId)}/pricing`)
      .then((rows) => {
        setItems(rows);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const onSaved = (saved: MachinePricing) => {
    setItems((cur) => cur.map((i) => (i.machineId === saved.machineId ? saved : i)));
    setEditing(null);
  };

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <TableLoading loading={loading}>
          <TableContainer>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Serviço</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Tempo estimado</TableCell>
                  <TableCell>Valor padrão</TableCell>
                  <TableCell>Promoção</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <PricingRow key={item.machineId} item={item} onEdit={() => setEditing(item)} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TableLoading>
        {!loading && !items.length && (
          <Box sx={{ p: 2.5 }}>
            <EmptyContent title="Nenhuma máquina nesta lavanderia" description="Cadastre máquinas na tab Máquinas para definir os preços." />
          </Box>
        )}
      </Card>
      {editing && <PricingDialog item={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </>
  );
}

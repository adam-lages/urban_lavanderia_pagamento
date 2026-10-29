import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useEffect, useState } from "react";
import { api, type Sale, type SalePage, type Store } from "../../api";
import { DetailDrawer } from "../../components/DetailDrawer";
import { downloadReceipt, receiptLines } from "./receipt";

export function SaleReceipt({ sale, store, onClose }: { sale: Sale | null; store: Store | undefined; onClose: () => void }) {
  const [items, setItems] = useState<Sale[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setItems([]);
    setError("");
    if (!sale) return;
    let active = true;
    const params = new URLSearchParams({ orderId: sale.orderId, limit: "100" });
    api<SalePage>(`/sales?${params}`)
      .then((data) => active && setItems(data.items?.length ? data.items : [sale]))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [sale]);

  const lines = items.length && store ? receiptLines(store, items) : [];

  const save = () => {
    if (!sale) return;
    downloadReceipt(`comprovante-${sale.orderId.slice(0, 8)}.txt`, lines);
    onClose();
  };

  return (
    <DetailDrawer
      title="Extrato"
      open={!!sale}
      onClose={onClose}
      footer={(
        <>
          <Button variant="outlined" color="inherit" onClick={onClose}>Cancelar</Button>
          <Button variant="contained" color="inherit" onClick={save} disabled={!lines.length}>Salvar</Button>
        </>
      )}
    >
      {!store && sale && <Alert severity="warning">Lavanderia da venda não encontrada.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {sale && store && !items.length && !error && <CircularProgress size={24} aria-label="Carregando comprovante" />}
      {lines.length > 0 && (
        <Box
          component="pre"
          aria-label="Comprovante"
          sx={{
            m: 0,
            p: 2.5,
            bgcolor: "#FFF9C4",
            color: "#1C252E",
            borderRadius: 1,
            fontFamily: '"SFMono-Regular", Menlo, Consolas, monospace',
            fontSize: 12,
            lineHeight: 1.6,
            whiteSpace: "pre",
            overflowX: "auto",
          }}
        >
          {lines.slice(0, -1).join("\n")}
          {"\n"}
          <Box component="strong" sx={{ fontWeight: 700 }}>{lines.at(-1)}</Box>
        </Box>
      )}
    </DetailDrawer>
  );
}

import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlined from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, brl, type Voucher } from "../api";
import { useAuth } from "../auth";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageHeader } from "../components/PageHeader";
import { useStores } from "../hooks";
import { STORE_FIELDS_GRID } from "./stores/StoreFieldsLayout";
import { draftFromVoucher } from "./wallet/draft";
import { useStoreCustomers } from "./wallet/useStoreCustomers";
import { VoucherFields } from "./wallet/VoucherFields";

export function VoucherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { stores } = useStores();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const customers = useStoreCustomers(voucher?.storeId ?? "");

  useEffect(() => {
    if (!id) return;
    api<Voucher>(`/vouchers/${id}`)
      .then((v) => { setVoucher(v); setError(""); })
      .catch((e) => setError(e.message));
  }, [id]);

  const remove = async () => {
    setConfirmDelete(false);
    try {
      await api(`/vouchers/${id}`, { method: "DELETE" });
      navigate("/carteira");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title={voucher?.code ?? "Voucher"}
        crumbs={[{ label: "Carteira", to: "/carteira" }, { label: voucher?.code ?? "Detalhes" }]}
        action={
          voucher && role === "FRANQUIA" && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" color="inherit" startIcon={<EditOutlined />} onClick={() => navigate(`/carteira/${id}/editar`)}>
                Editar
              </Button>
              <Button color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setConfirmDelete(true)}>
                Excluir
              </Button>
            </Stack>
          )
        }
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {voucher && (
        <Card>
          <CardContent>
            <Box sx={{ ...STORE_FIELDS_GRID, mb: 3 }}>
              <TextField label="Saldo disponível" value={brl(voucher.balanceCents)} disabled slotProps={{ htmlInput: { "aria-label": "Saldo disponível", readOnly: true } }} />
              <TextField label="Usos" value={String(voucher.uses)} disabled slotProps={{ htmlInput: { "aria-label": "Usos", readOnly: true } }} />
            </Box>
            <VoucherFields draft={draftFromVoucher(voucher)} stores={stores} customers={customers} disabled onChange={() => undefined} />
          </CardContent>
        </Card>
      )}
      {confirmDelete && voucher && (
        <ConfirmDialog
          title="Excluir voucher"
          message={`Excluir o voucher "${voucher.code}"? Vouchers já usados não podem ser apagados.`}
          confirmLabel="Excluir"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void remove()}
        />
      )}
    </>
  );
}

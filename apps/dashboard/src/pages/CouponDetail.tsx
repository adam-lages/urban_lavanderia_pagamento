import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlined from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Coupon, type Customer, type CustomerPage } from "../api";
import { useAuth } from "../auth";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageHeader } from "../components/PageHeader";
import { useStores } from "../hooks";
import { CouponBasics } from "./coupons/CouponBasics";
import { draftFromCoupon, EMPTY_DRAFT } from "./coupons/draft";

export function CouponDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { stores } = useStores();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canEdit = role === "FRANQUIA";

  useEffect(() => {
    if (!id) return;
    api<Coupon>(`/coupons/${id}`)
      .then((c) => { setCoupon(c); setError(""); })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!coupon?.storeId) return;
    api<CustomerPage>(`/customers?storeId=${coupon.storeId}&page=0&limit=100`)
      .then((data) => setCustomers(data.items ?? []))
      .catch(() => setCustomers([]));
  }, [coupon?.storeId]);

  const remove = async () => {
    setConfirmDelete(false);
    try {
      await api(`/coupons/${id}`, { method: "DELETE" });
      navigate("/cupons");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const draft = coupon ? draftFromCoupon(coupon) : EMPTY_DRAFT;

  return (
    <>
      <PageHeader
        title={coupon?.code ?? "Cupom"}
        crumbs={[{ label: "Cupons", to: "/cupons" }, { label: coupon?.code ?? "Detalhes" }]}
        action={
          coupon && canEdit && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" color="inherit" startIcon={<EditOutlined />} onClick={() => navigate(`/cupons/${id}/editar`)}>
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
      {coupon && (
        <Card>
          <CardContent>
            <CouponBasics draft={draft} stores={stores} customers={customers} disabled onChange={() => undefined} />
          </CardContent>
        </Card>
      )}
      {confirmDelete && coupon && (
        <ConfirmDialog
          title="Excluir cupom"
          message={`Excluir o cupom "${coupon.code}"?`}
          confirmLabel="Excluir"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void remove()}
        />
      )}
    </>
  );
}

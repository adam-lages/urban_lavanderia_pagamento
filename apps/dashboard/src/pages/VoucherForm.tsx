import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Voucher } from "../api";
import { PageHeader } from "../components/PageHeader";
import { useStores } from "../hooks";
import { draftFromVoucher, EMPTY_VOUCHER, voucherReady, type VoucherDraft } from "./wallet/draft";
import { useStoreCustomers } from "./wallet/useStoreCustomers";
import { VoucherFields } from "./wallet/VoucherFields";

export function VoucherForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { stores } = useStores();
  const [draft, setDraft] = useState<VoucherDraft>(EMPTY_VOUCHER);
  const [code, setCode] = useState("");
  const [loaded, setLoaded] = useState(isNew);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const customers = useStoreCustomers(draft.storeId);

  useEffect(() => {
    if (!id) return;
    api<Voucher>(`/vouchers/${id}`)
      .then((v) => { setDraft(draftFromVoucher(v)); setCode(v.code); setLoaded(true); setError(""); })
      .catch((e) => setError(e.message));
  }, [id]);

  const ready = voucherReady(draft);
  const cancelTo = isNew ? "/carteira" : `/carteira/${id}`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = await api<Voucher>("/vouchers", { method: "POST", body: draft });
        navigate(`/carteira/${created.id}`);
      } else {
        await api(`/vouchers/${id}`, { method: "PATCH", body: draft });
        navigate(`/carteira/${id}`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={isNew ? "Novo voucher" : "Editar voucher"}
        crumbs={[{ label: "Carteira", to: "/carteira" }, { label: isNew ? "Novo voucher" : code || "Editar" }]}
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {loaded && (
        <Card>
          <CardContent>
            <Box component="form" onSubmit={(e) => void onSubmit(e)}>
              <VoucherFields draft={draft} stores={stores} customers={customers} onChange={(p) => setDraft((prev) => ({ ...prev, ...p }))} />
              <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mt: 3 }}>
                <Button variant="outlined" color="inherit" onClick={() => navigate(cancelTo)}>Cancelar</Button>
                <Button type="submit" variant="contained" color="inherit" disabled={saving || !ready}>
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}
    </>
  );
}

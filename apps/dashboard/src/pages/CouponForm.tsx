import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Coupon, type Customer, type CustomerPage } from "../api";
import { PageHeader } from "../components/PageHeader";
import { useStores } from "../hooks";
import { CouponBasics } from "./coupons/CouponBasics";
import { draftFromCoupon, draftReady, EMPTY_DRAFT, type CouponDraft } from "./coupons/draft";

export function CouponForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { stores } = useStores();
  const [draft, setDraft] = useState<CouponDraft>(EMPTY_DRAFT);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const patch = (next: Partial<CouponDraft>) => setDraft((prev) => ({ ...prev, ...next }));

  useEffect(() => {
    if (isNew) {
      api<{ code: string }>("/coupons/next-code")
        .then((r) => {
          setDraft({ ...EMPTY_DRAFT, generated: true, code: r.code });
          setLoaded(true);
          setError("");
        })
        .catch((e) => setError(e.message));
      return;
    }
    if (!id) return;
    api<Coupon>(`/coupons/${id}`)
      .then((c) => {
        setDraft(draftFromCoupon(c));
        setLoaded(true);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [id, isNew]);

  useEffect(() => {
    if (!draft.storeId) {
      setCustomers([]);
      return;
    }
    api<CustomerPage>(`/customers?storeId=${draft.storeId}&page=0&limit=100`)
      .then((data) => setCustomers(data.items ?? []))
      .catch(() => setCustomers([]));
  }, [draft.storeId]);

  const toggleGenerated = async (generated: boolean) => {
    if (!generated) {
      patch({ generated });
      return;
    }
    try {
      const r = await api<{ code: string }>("/coupons/next-code");
      patch({ generated: true, code: r.code });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const ready = draftReady(draft);
  const cancelTo = isNew ? "/cupons" : `/cupons/${id}`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = await api<Coupon>("/coupons", { method: "POST", body: draft });
        navigate(`/cupons/${created.id}`);
      } else {
        await api(`/coupons/${id}`, { method: "PATCH", body: draft });
        navigate(`/cupons/${id}`);
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
        title={isNew ? "Novo cupom" : "Editar cupom"}
        crumbs={[{ label: "Cupons", to: "/cupons" }, { label: isNew ? "Novo cupom" : draft.code || "Editar" }]}
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {loaded && (
        <Card>
          <CardContent>
            <Box component="form" onSubmit={(e) => void onSubmit(e)}>
              <CouponBasics
                draft={draft}
                stores={stores}
                customers={customers}
                onChange={(p) => ("generated" in p ? void toggleGenerated(Boolean(p.generated)) : patch(p))}
              />
              <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mt: 3 }}>
                <Button variant="outlined" color="inherit" onClick={() => navigate(cancelTo)}>
                  Cancelar
                </Button>
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

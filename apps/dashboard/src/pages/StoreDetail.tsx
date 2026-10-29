import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlined from "@mui/icons-material/EditOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import LocalLaundryServiceOutlined from "@mui/icons-material/LocalLaundryServiceOutlined";
import LocalOfferOutlined from "@mui/icons-material/LocalOfferOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { alpha } from "@mui/material/styles";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, type Store } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageHeader } from "../components/PageHeader";
import { StoreData } from "./stores/StoreData";
import { StoreMachinesTable } from "./stores/StoreMachinesTable";
import { StorePrices } from "./stores/StorePrices";
import { StorePromotions } from "./stores/StorePromotions";

type StoreTab = "dados" | "maquinas" | "precos" | "promocao";

export function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as StoreTab | null) ?? "dados";
  const setTab = (t: StoreTab) => setParams({ tab: t }, { replace: true });

  useEffect(() => {
    if (!id) return;
    api<Store>(`/stores/${id}`)
      .then((s) => {
        setStore(s);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const remove = async () => {
    setConfirmDelete(false);
    try {
      await api(`/stores/${id}`, { method: "DELETE" });
      navigate("/lavanderias");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title={store?.name ?? "Lavanderia"}
        crumbs={[
          { label: "Lavanderias", to: "/lavanderias" },
          { label: store?.name ?? "Detalhes" },
        ]}
        action={
          store && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" color="inherit" startIcon={<EditOutlined />} onClick={() => navigate(`/lavanderias/${id}/editar`)}>
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
      <Tabs
        value={tab}
        onChange={(_, v: StoreTab) => setTab(v)}
        sx={(t) => ({ mb: 3, boxShadow: `inset 0 -2px 0 0 ${alpha(t.palette.grey[500], 0.08)}` })}
      >
        <Tab value="dados" icon={<InfoOutlined fontSize="small" />} iconPosition="start" label="Dados" sx={{ gap: 1 }} />
        <Tab value="maquinas" icon={<LocalLaundryServiceOutlined fontSize="small" />} iconPosition="start" label="Máquinas" sx={{ gap: 1 }} />
        <Tab value="precos" icon={<PaymentsOutlined fontSize="small" />} iconPosition="start" label="Preços" sx={{ gap: 1 }} />
        <Tab value="promocao" icon={<LocalOfferOutlined fontSize="small" />} iconPosition="start" label="Promoção" sx={{ gap: 1 }} />
      </Tabs>
      {store && tab === "dados" && <StoreData store={store} />}
      {id && store && tab === "maquinas" && <StoreMachinesTable storeId={id} />}
      {id && store && tab === "precos" && <StorePrices storeId={id} />}
      {id && store && tab === "promocao" && <StorePromotions storeId={id} />}
      {confirmDelete && store && (
        <ConfirmDialog
          title="Excluir lavanderia"
          message={`Excluir "${store.name}"? Lojas com vendas não podem ser apagadas.`}
          confirmLabel="Excluir"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void remove()}
        />
      )}
    </>
  );
}

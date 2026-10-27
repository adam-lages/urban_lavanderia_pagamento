import InfoOutlined from "@mui/icons-material/InfoOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import Alert from "@mui/material/Alert";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { alpha } from "@mui/material/styles";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type Customer } from "../api";
import { PageHeader } from "../components/PageHeader";
import { ClientProfile } from "./clients/ClientProfile";
import { ClientPurchases } from "./clients/ClientPurchases";

type ClientTab = "dados" | "compras";

export function ClientDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<ClientTab>("dados");

  useEffect(() => {
    if (!id) return;
    api<Customer>(`/customers/${id}`)
      .then((c) => { setCustomer(c); setError(""); })
      .catch((e) => setError(e.message));
  }, [id]);

  const toggleBlock = async (blocked: boolean) => {
    if (!id) return;
    try {
      const next = await api<Customer>(`/customers/${id}`, { method: "PATCH", body: { blocked } });
      setCustomer(next);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title={customer?.name ?? "Cliente"}
        crumbs={[{ label: "Listagem de clientes", to: "/clientes" }, { label: customer?.name ?? "Detalhes" }]}
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Tabs
        value={tab}
        onChange={(_, v: ClientTab) => setTab(v)}
        sx={(t) => ({ mb: 3, boxShadow: `inset 0 -2px 0 0 ${alpha(t.palette.grey[500], 0.08)}` })}
      >
        <Tab value="dados" icon={<InfoOutlined fontSize="small" />} iconPosition="start" label="Dados do cliente" sx={{ gap: 1 }} />
        <Tab value="compras" icon={<ReceiptLongOutlined fontSize="small" />} iconPosition="start" label="Compras" sx={{ gap: 1 }} />
      </Tabs>
      {customer && tab === "dados" && <ClientProfile customer={customer} onToggleBlock={(v) => void toggleBlock(v)} />}
      {id && tab === "compras" && <ClientPurchases customerId={id} />}
    </>
  );
}

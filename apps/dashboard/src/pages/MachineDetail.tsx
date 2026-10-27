import EditOutlined from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Machine } from "../api";
import { PageHeader } from "../components/PageHeader";
import { MachineProfile } from "./machines/MachineProfile";

export function MachineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    api<Machine>(`/machines/${id}`)
      .then((m) => { setMachine(m); setError(""); })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const toggleBlock = async (blocked: boolean) => {
    if (!id) return;
    try {
      const next = await api<Machine>(`/machines/${id}`, { method: "PATCH", body: { blocked } });
      setMachine(next);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title={machine?.label ?? "Máquina"}
        crumbs={[{ label: "Máquinas", to: "/maquinas" }, { label: machine?.label ?? "Detalhes" }]}
        action={
          machine && (
            <Button variant="outlined" color="inherit" startIcon={<EditOutlined />} onClick={() => navigate(`/maquinas/${id}/editar`)}>
              Editar
            </Button>
          )
        }
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {machine && <MachineProfile machine={machine} onToggleBlock={(v) => void toggleBlock(v)} />}
    </>
  );
}

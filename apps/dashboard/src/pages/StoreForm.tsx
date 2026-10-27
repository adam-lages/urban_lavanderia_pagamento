import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Store } from "../api";
import { PageHeader } from "../components/PageHeader";

export function StoreForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (isNew || !id) return;
    api<Store>(`/stores/${id}`)
      .then((s) => {
        setName(s.name);
        setAddress(s.address ?? "");
        setCode(s.code);
        setLoaded(true);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [id, isNew]);

  const cancelTo = isNew ? "/lavanderias" : `/lavanderias/${id}`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const digits = code.replace(/\D/g, "");
      const body = { name: name.trim(), address: address.trim(), code: digits || undefined };
      if (isNew) {
        const created = await api<Store>("/stores", { method: "POST", body });
        navigate(`/lavanderias/${created.id}`);
      } else {
        await api(`/stores/${id}`, { method: "PATCH", body });
        navigate(`/lavanderias/${id}`);
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
        title={isNew ? "Nova lavanderia" : "Editar lavanderia"}
        crumbs={[
          { label: "Minhas Lavanderias", to: "/lavanderias" },
          { label: isNew ? "Nova lavanderia" : "Editar" },
        ]}
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {loaded && (
        <Card>
          <CardContent>
            <Stack component="form" spacing={3} onSubmit={(e) => void onSubmit(e)}>
              <TextField
                label="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                slotProps={{ htmlInput: { "aria-label": "Nome" } }}
              />
              <TextField
                label="Endereço"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                multiline
                minRows={2}
                slotProps={{ htmlInput: { "aria-label": "Endereço" } }}
              />
              <TextField
                label="Código"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                helperText="Numérico, 8 dígitos. Se vazio no cadastro, o sistema gera um."
                slotProps={{ htmlInput: { "aria-label": "Código", inputMode: "numeric" } }}
              />
              <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                <Button variant="outlined" color="inherit" onClick={() => navigate(cancelTo)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="contained" color="inherit" disabled={saving || !name.trim()}>
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
    </>
  );
}

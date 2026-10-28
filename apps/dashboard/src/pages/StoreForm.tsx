import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ROLES, ROLE_LABEL, type Role, type Store } from "../api";
import { PageHeader } from "../components/PageHeader";
import { cnpjDigits, formatCnpj } from "./stores/format";

export function StoreForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [address, setAddress] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [role, setRole] = useState<Role>("FRANQUIA");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ready = !!name.trim() && !!legalName.trim() && cnpjDigits(cnpj).length === 14 && (!isNew || !!code);

  useEffect(() => {
    if (isNew) {
      api<{ code: string }>("/stores/next-code")
        .then((r) => {
          setCode(r.code);
          setLoaded(true);
          setError("");
        })
        .catch((e) => setError(e.message));
      return;
    }
    if (!id) return;
    api<Store>(`/stores/${id}`)
      .then((s) => {
        setName(s.name);
        setLegalName(s.legalName ?? "");
        setAddress(s.address ?? "");
        setCnpj(formatCnpj(s.cnpj));
        setRole(s.role);
        setCode(s.code);
        setLoaded(true);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [id, isNew]);

  const cancelTo = isNew ? "/lavanderias" : `/lavanderias/${id}`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), legalName: legalName.trim(), address: address.trim(), cnpj: cnpjDigits(cnpj), role };
      if (isNew) {
        const created = await api<Store>("/stores", { method: "POST", body: { ...body, code } });
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
          { label: "Lavanderias", to: "/lavanderias" },
          { label: isNew ? "Nova lavanderia" : "Editar" },
        ]}
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {loaded && (
        <Card>
          <CardContent>
            <Stack component="form" spacing={3} onSubmit={(e) => void onSubmit(e)}>
              <TextField
                label="Razão social"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                required
                slotProps={{ htmlInput: { "aria-label": "Razão social" } }}
              />
              <TextField
                label="Nome fantasia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                slotProps={{ htmlInput: { "aria-label": "Nome fantasia" } }}
              />
              <TextField
                label="CNPJ"
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                required
                placeholder="00.000.000/0000-00"
                slotProps={{ htmlInput: { "aria-label": "CNPJ" } }}
              />
              <TextField
                select
                label="Permissão"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                required
                slotProps={{ htmlInput: { "aria-label": "Permissão" } }}
              >
                {ROLES.map((item) => (
                  <MenuItem key={item} value={item}>{ROLE_LABEL[item]}</MenuItem>
                ))}
              </TextField>
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
                disabled
                helperText="Gerado automaticamente. Não pode ser alterado."
                slotProps={{ htmlInput: { "aria-label": "Código", readOnly: true } }}
              />
              <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                <Button variant="outlined" color="inherit" onClick={() => navigate(cancelTo)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="contained" color="inherit" disabled={saving || !ready}>
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

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ROLES, ROLE_LABEL, type Role, type Store } from "../api";
import { useAuth } from "../auth";
import { PageHeader } from "../components/PageHeader";
import { cnpjDigits, formatCnpj } from "./stores/format";
import { STORE_FIELDS_GRID, StoreSection } from "./stores/StoreFieldsLayout";
import { isLoginValid, StoreLoginFields } from "./stores/StoreLoginFields";

export function StoreForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [address, setAddress] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [role, setRole] = useState<Role>("FRANQUEADO");
  const [customRole, setCustomRole] = useState(false);
  const [code, setCode] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [hasLogin, setHasLogin] = useState(false);
  const [franchiseEmail, setFranchiseEmail] = useState(user?.email ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const sharedLogin = role === "FRANQUIA";
  const loginOk = sharedLogin || (isLoginValid(loginEmail, loginPassword, hasLogin) && (!isNew || !!loginEmail.trim()));
  const ready = !!name.trim() && !!legalName.trim() && cnpjDigits(cnpj).length === 14 && (!isNew || !!code) && loginOk;

  useEffect(() => {
    if (isNew) {
      api<{ code: string; franchiseEmail?: string }>("/stores/next-code")
        .then((r) => {
          setCode(r.code);
          if (r.franchiseEmail) setFranchiseEmail(r.franchiseEmail);
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
        setLoginEmail(s.loginEmail ?? "");
        setHasLogin(!!s.loginEmail);
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
      const body = {
        name: name.trim(),
        legalName: legalName.trim(),
        address: address.trim(),
        cnpj: cnpjDigits(cnpj),
        role: isNew ? role : undefined,
        loginEmail: sharedLogin ? undefined : (loginEmail.trim() || undefined),
        loginPassword: sharedLogin ? undefined : (loginPassword || undefined),
      };
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
            <Box component="form" onSubmit={(e) => void onSubmit(e)} sx={STORE_FIELDS_GRID}>
              <StoreSection title="Dados da empresa" />
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
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <TextField
                  select
                  label="Permissão"
                  value={role}
                  onChange={(e) => {
                    const next = e.target.value as Role;
                    setRole(next);
                    if (next === "FRANQUIA") {
                      setLoginEmail(franchiseEmail);
                      setLoginPassword("");
                    } else {
                      setLoginEmail("");
                      setLoginPassword("");
                    }
                  }}
                  required
                  disabled={!isNew || !customRole}
                  fullWidth
                  helperText={isNew ? "Padrão Franqueado. Marque ao lado para alterar." : "Não pode ser alterada após o cadastro."}
                  slotProps={{ htmlInput: { "aria-label": "Permissão" } }}
                >
                  {ROLES.map((item) => (
                    <MenuItem key={item} value={item}>{ROLE_LABEL[item]}</MenuItem>
                  ))}
                </TextField>
                {isNew && (
                  <FormControlLabel
                    sx={{ mt: 1, mr: 0, whiteSpace: "nowrap" }}
                    control={
                      <Checkbox
                        checked={customRole}
                        onChange={(_, v) => {
                          setCustomRole(v);
                          if (!v) {
                            setRole("FRANQUEADO");
                            setLoginEmail("");
                            setLoginPassword("");
                          }
                        }}
                        slotProps={{ input: { "aria-label": "Alterar permissão" } }}
                      />
                    }
                    label="Alterar"
                  />
                )}
              </Box>
              <TextField
                label="Código"
                value={code}
                disabled
                helperText="Gerado automaticamente. Não pode ser alterado."
                slotProps={{ htmlInput: { "aria-label": "Código", readOnly: true } }}
              />
              <TextField
                label="Endereço"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                slotProps={{ htmlInput: { "aria-label": "Endereço" } }}
              />
              <StoreSection title="Acesso ao sistema" />
              <StoreLoginFields
                email={loginEmail}
                password={loginPassword}
                hasLogin={hasLogin}
                locked={sharedLogin}
                onEmail={setLoginEmail}
                onPassword={setLoginPassword}
              />
              <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", gridColumn: "1 / -1" }}>
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

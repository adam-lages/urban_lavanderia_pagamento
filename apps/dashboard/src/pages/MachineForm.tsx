import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams} from "react-router-dom";
import { api, DEFAULT_MACHINE_MODEL, MACHINE_MODELS, type Board, type Kind, type Machine, type MachineModel } from "../api";
import { PageHeader } from "../components/PageHeader";
import { useStores } from "../hooks";
import { DefaultableField } from "./machines/DefaultableField";
import { storeMachinesPath } from "./stores/paths";

const DEFAULT_CHANNEL = "100";
const MAX_CYCLE_MINUTES = 240;

function defaultCycleMinutes(kind: Kind) {
  return kind === "DRYER" ? "45" : "30";
}

function boardLabel(b: Pick<Board, "deviceId" | "online" | "info">) {
  const ip = b.info?.ip ? ` · ${b.info.ip}` : "";
  return `${b.deviceId} — ${b.online ? "Online" : "Offline"}${ip}`;
}

export function MachineForm() {
  const { storeId: routeStoreId, machineId: id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { stores } = useStores();
  const [storeId, setStoreId] = useState(routeStoreId ?? "");
  const [kind, setKind] = useState<Kind>("WASHER");
  const [model, setModel] = useState<MachineModel>(DEFAULT_MACHINE_MODEL);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [channel, setChannel] = useState(DEFAULT_CHANNEL);
  const [customChannel, setCustomChannel] = useState(false);
  const [cycle, setCycle] = useState(defaultCycleMinutes("WASHER"));
  const [customCycle, setCustomCycle] = useState(false);
  const defaultCycle = defaultCycleMinutes(kind);
  const [boards, setBoards] = useState<Board[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadBoards = useCallback(() => {
    Promise.all([api<Board[]>("/boards"), api<Machine[]>("/machines")])
      .then(([list, rows]) => {
        setBoards(list);
        setLinkedIds(rows.filter((m) => m.id !== id).map((m) => m.deviceId));
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    loadBoards();
    const t = setInterval(loadBoards, 3000);
    return () => clearInterval(t);
  }, [loadBoards]);

  useEffect(() => {
    if (isNew) {
      api<{ code: string }>("/machines/next-code")
        .then((r) => {
          setCode(r.code);
          setLoaded(true);
          setError("");
        })
        .catch((e) => setError(e.message));
      return;
    }
    if (!id) return;
    api<Machine>(`/machines/${id}`)
      .then((m) => {
        setStoreId(m.storeId);
        setKind(m.kind);
        setModel(m.model ?? DEFAULT_MACHINE_MODEL);
        setLabel(m.label);
        setCode(m.code);
        setDeviceId(m.deviceId);
        setChannel(String(m.channel));
        setCustomChannel(String(m.channel) !== DEFAULT_CHANNEL);
        setCycle(String(m.cycleMinutes));
        setCustomCycle(String(m.cycleMinutes) !== defaultCycleMinutes(m.kind));
        setLoaded(true);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [id, isNew]);

  const storeTo = storeMachinesPath(routeStoreId);
  const cancelTo = isNew ? storeTo : `/lavanderias/${routeStoreId}/maquinas/${id}`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        storeId,
        kind,
        model,
        label: label.trim(),
        code: isNew ? code : undefined,
        deviceId: deviceId.trim() || "",
        channel: Number(channel),
        cycleMinutes: Number(customCycle ? cycle : defaultCycle),
      };
      if (isNew) {
        const created = await api<Machine>("/machines", { method: "POST", body });
        navigate(`/lavanderias/${routeStoreId}/maquinas/${created.id}`);
      } else {
        await api(`/machines/${id}`, { method: "PATCH", body });
        navigate(cancelTo);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const boardOptions = useMemo(() => {
    const free = boards.filter((b) => !linkedIds.includes(b.deviceId) || b.deviceId === deviceId);
    if (deviceId && !free.some((b) => b.deviceId === deviceId)) {
      return [{ deviceId, online: false, info: null } as Board, ...free];
    }
    return free;
  }, [boards, linkedIds, deviceId]);

  const cycleOk = !customCycle || (Number(cycle) >= 1 && Number(cycle) <= MAX_CYCLE_MINUTES);
  const canSave = Boolean(storeId && label.trim() && cycleOk && Number(channel) >= 100 && (!isNew || code));

  return (
    <>
      <PageHeader
        title={isNew ? "Nova máquina" : "Editar máquina"}
        crumbs={[
          { label: "Lavanderias", to: "/lavanderias" },
          { label: stores.find((s) => s.id === routeStoreId)?.name ?? "Lavanderia", to: storeTo },
          { label: isNew ? "Nova máquina" : "Editar" },
        ]}
      />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {loaded && (
        <Card>
          <CardContent>
            <Box component="form" onSubmit={(e) => void onSubmit(e)}>
              <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                <TextField
                  select
                  label="Lavanderia"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  required
                  disabled
                  slotProps={{ htmlInput: { "aria-label": "Lavanderia" } }}
                >
                  {stores.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Tipo"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as Kind)}
                  slotProps={{ htmlInput: { "aria-label": "Tipo" } }}
                >
                  <MenuItem value="WASHER">Lavadora</MenuItem>
                  <MenuItem value="DRYER">Secadora</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Maquinário"
                  value={model}
                  onChange={(e) => setModel(e.target.value as MachineModel)}
                  helperText="Modelo das máquinas usadas na lavanderia."
                  slotProps={{ htmlInput: { "aria-label": "Maquinário" } }}
                >
                  {MACHINE_MODELS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Nome"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                  helperText="Ex.: Lavadora 1"
                  slotProps={{ htmlInput: { "aria-label": "Nome" } }}
                />
                <TextField
                  label="Código"
                  value={code}
                  disabled
                  helperText="Gerado na criação. Não pode ser alterado."
                  slotProps={{ htmlInput: { "aria-label": "Código", readOnly: true } }}
                />
                <TextField
                  select
                  label="Placa ESP32"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  helperText="Opcional. Ligue a ESP32 para ela aparecer. Uma placa por máquina."
                  slotProps={{ htmlInput: { "aria-label": "Placa ESP32" } }}
                >
                  <MenuItem value="">Selecione a placa</MenuItem>
                  {boardOptions.map((b) => (
                    <MenuItem key={b.deviceId} value={b.deviceId}>{boardLabel(b)}</MenuItem>
                  ))}
                </TextField>
                <DefaultableField
                  label="Canal"
                  value={channel}
                  defaultValue={DEFAULT_CHANNEL}
                  custom={customChannel}
                  maxDigits={4}
                  helperText="Padrão 100. Marque ao lado para alterar."
                  onChange={setChannel}
                  onCustom={setCustomChannel}
                />
                <DefaultableField
                  label="Tempo de ciclo"
                  value={cycle}
                  defaultValue={defaultCycle}
                  custom={customCycle}
                  maxDigits={3}
                  unit="min"
                  helperText={`Padrão ${defaultCycle} min para ${kind === "DRYER" ? "secar" : "lavar"}. Marque ao lado para alterar.`}
                  onChange={setCycle}
                  onCustom={setCustomCycle}
                />
              </Box>
              <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mt: 3 }}>
                <Button variant="outlined" color="inherit" onClick={() => navigate(cancelTo)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="contained" color="inherit" disabled={saving || !canSave}>
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

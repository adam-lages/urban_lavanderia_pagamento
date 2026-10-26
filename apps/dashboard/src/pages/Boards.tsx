import { useCallback, useEffect, useState } from "react";
import { api, kindLabel, type Board, type Command, type Kind } from "../api";
import { useStores } from "../hooks";

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");

const STATE_LABEL: Record<string, string> = {
  PENDING: "Enviando…",
  SENT: "Enviado (aguardando confirmação)",
  DONE: "Confirmado",
  UNCONFIRMED: "Não confirmado",
  FAILED: "Recusado pela placa",
  EXPIRED: "Expirado",
};
const FINAL = ["DONE", "UNCONFIRMED", "FAILED", "EXPIRED"];

interface Detail extends Command { events: Array<{ type: string; detail: string | null; createdAt: string }> }

function BoardForm({ board, onSaved }: { board: Board; onSaved: () => void }) {
  const { stores } = useStores();
  const [name, setName] = useState(board.name ?? "");
  const [storeId, setStoreId] = useState(board.storeId ?? "");
  const [kind, setKind] = useState<Kind | "">(board.kind ?? "");
  const [error, setError] = useState("");
  const save = async () => {
    try {
      await api(`/boards/${board.deviceId}`, {
        method: "PATCH",
        body: { name: name.trim() || undefined, storeId: storeId || undefined, kind: kind || undefined },
      });
      setError("");
      onSaved();
    } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="toolbar">
      <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Lavadora 3" /></label>
      <label>Loja
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="">Escolha…</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label>Tipo
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind | "")}>
          <option value="">Escolha…</option>
          <option value="WASHER">Lava</option>
          <option value="DRYER">Seca</option>
        </select>
      </label>
      <button onClick={save}>Salvar</button>
      {error && <span className="error">{error}</span>}
    </div>
  );
}

export function Boards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [active, setActive] = useState<Record<string, Detail>>({});
  const [logOf, setLogOf] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Board[]>("/boards").then((r) => { setBoards(r); setError(""); }).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);

  const track = useCallback((deviceId: string, commandId: string) => {
    const poll = async () => {
      const d = await api<Detail>(`/commands/${commandId}`);
      setActive((a) => ({ ...a, [deviceId]: d }));
      if (!FINAL.includes(d.status)) setTimeout(() => void poll().catch(() => undefined), 1000);
      else load();
    };
    void poll().catch((e) => setError(e.message));
  }, [load]);

  const release = async (b: Board) => {
    const label = b.name ?? b.deviceId;
    if (!confirm(`Liberar a máquina "${label}" agora? A placa vai acionar a máquina uma vez.`)) return;
    try {
      const cmd = await api<Command>(`/boards/${b.deviceId}/release`, { method: "POST" });
      setError("");
      track(b.deviceId, cmd.id);
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <section>
      <p>Placas ESP32 detectadas. Atualiza a cada 3 segundos.</p>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr><th>Status</th><th>Nome</th><th>Loja</th><th>Tipo</th><th>ID da placa</th><th>Visto por último</th><th>Wi-Fi / firmware</th><th></th></tr>
        </thead>
        <tbody>
          {boards.map((b) => {
            const cmd = active[b.deviceId];
            return (
              <tr key={b.deviceId}>
                <td><span className={`badge ${b.online ? "DONE" : "FAILED"}`}>{b.online ? "Online" : "Offline"}</span></td>
                <td>{b.registered || b.name ? b.name ?? "—" : <em>Nova placa</em>}</td>
                <td>{b.storeName ?? "—"}</td>
                <td>{b.kind ? kindLabel(b.kind) : "—"}</td>
                <td><code>{b.deviceId}</code></td>
                <td>{fmt(b.lastSeenAt)}</td>
                <td>{b.info ? `${b.info.rssi ?? "?"} dBm · ${b.info.fw ?? "?"}` : "—"}</td>
                <td>
                  <button disabled={!b.online} title={b.online ? "" : "Placa offline"} onClick={() => release(b)}>Liberar máquina</button>{" "}
                  <button onClick={() => setEditing(editing === b.deviceId ? null : b.deviceId)}>{b.registered ? "Editar" : "Cadastrar"}</button>
                  {cmd && (
                    <div>
                      <span className={`badge ${cmd.status}`}>{STATE_LABEL[cmd.status] ?? cmd.status}</span>{" "}
                      <button onClick={() => setLogOf(logOf === b.deviceId ? null : b.deviceId)}>Log</button>
                    </div>
                  )}
                  {editing === b.deviceId && <BoardForm board={b} onSaved={() => { setEditing(null); load(); }} />}
                  {logOf === b.deviceId && cmd && (
                    <ul>{cmd.events.map((e, i) => <li key={i}>{fmt(e.createdAt)} — <strong>{e.type}</strong> {e.detail}</li>)}</ul>
                  )}
                </td>
              </tr>
            );
          })}
          {!boards.length && <tr><td colSpan={8}>Nenhuma placa detectada ainda. Ligue a ESP32 com o firmware gravado.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

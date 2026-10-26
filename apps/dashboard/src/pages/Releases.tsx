import { useCallback, useEffect, useState } from "react";
import { api, type Command } from "../api";
import { useStores } from "../hooks";

const STATUSES = ["PENDING", "SENT", "DONE", "UNCONFIRMED", "FAILED", "EXPIRED"];
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");

interface Detail extends Command { events: Array<{ type: string; detail: string | null; createdAt: string }> }

export function Releases() {
  const { stores } = useStores();
  const [status, setStatus] = useState("");
  const [storeId, setStoreId] = useState("");
  const [rows, setRows] = useState<Command[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (storeId) q.set("storeId", storeId);
    api<Command[]>(`/commands?${q}`).then((r) => { setRows(r); setError(""); }).catch((e) => setError(e.message));
  }, [status, storeId]);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const retry = async (id: string) => {
    if (!confirm("Reenviar este comando? A placa ignora comandos já executados, mas confirme na máquina antes.")) return;
    try { await api(`/commands/${id}/retry`, { method: "POST" }); load(); } catch (e) { setError((e as Error).message); }
  };

  return (
    <section>
      <div className="toolbar">
        <label>Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>Loja
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Todas</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Criado</th><th>Loja</th><th>Máquina</th><th>Canal</th><th>Status</th><th>Tentativas</th><th>Concluído</th><th></th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{fmt(c.issuedAt)}</td><td>{stores.find((s) => s.id === c.storeId)?.name}</td><td>{c.deviceId}</td><td>{c.channel}</td>
              <td><span className={`badge ${c.status}`}>{c.status}</span></td><td>{c.attempts}</td><td>{fmt(c.doneAt)}</td>
              <td>
                <button onClick={() => api<Detail>(`/commands/${c.id}`).then(setDetail)}>Log</button>{" "}
                {c.status !== "DONE" && <button onClick={() => retry(c.id)}>Reenviar</button>}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={8}>Nenhuma liberação.</td></tr>}
        </tbody>
      </table>
      {detail && (
        <div className="card">
          <h3>Log do comando {detail.id.slice(0, 8)} <button onClick={() => setDetail(null)}>Fechar</button></h3>
          <ul>{detail.events.map((e, i) => <li key={i}>{fmt(e.createdAt)} — <strong>{e.type}</strong> {e.detail}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

import { useCallback, useEffect, useState } from "react";
import { api, kindLabel, type Board, type Command } from "../api";
import { BoardForm } from "../components/BoardForm";
import { ConfirmDialog } from "../components/ConfirmDialog";

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

interface Detail extends Command {
  events: Array<{ type: string; detail: string | null; createdAt: string }>;
}

function displayName(b: Board) {
  if (b.registered || b.name) return b.name ?? "—";
  return "Nova placa";
}

export function Machines() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [active, setActive] = useState<Record<string, Detail>>({});
  const [logOf, setLogOf] = useState<string | null>(null);
  const [pending, setPending] = useState<Board | null>(null);

  const load = useCallback(() => {
    api<Board[]>("/boards")
      .then((r) => {
        setBoards(r);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const track = useCallback(
    (deviceId: string, commandId: string) => {
      const poll = async () => {
        const d = await api<Detail>(`/commands/${commandId}`);
        setActive((a) => ({ ...a, [deviceId]: d }));
        if (!FINAL.includes(d.status)) setTimeout(() => void poll().catch(() => undefined), 1000);
        else load();
      };
      void poll().catch((e) => setError(e.message));
    },
    [load],
  );

  const release = async (b: Board) => {
    try {
      const cmd = await api<Command>(`/boards/${b.deviceId}/release`, { method: "POST" });
      setError("");
      track(b.deviceId, cmd.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Máquinas</h1>
          <p className="muted">Lavadoras e secadoras detectadas. A lista atualiza a cada 3 segundos.</p>
        </div>
      </header>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Loja</th>
              <th>Status</th>
              <th>Última vez visto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {boards.map((b) => {
              const cmd = active[b.deviceId];
              const lastStatus = cmd?.status ?? b.lastCommand?.status;
              return (
                <tr key={b.deviceId}>
                  <td>
                    <div className="machine-name">
                      <strong>{displayName(b)}</strong>
                      <code>{b.deviceId}</code>
                    </div>
                  </td>
                  <td>{b.kind ? kindLabel(b.kind) : "—"}</td>
                  <td>{b.storeName ?? "—"}</td>
                  <td>
                    <span className={`badge ${b.online ? "DONE" : "FAILED"}`}>{b.online ? "Online" : "Offline"}</span>
                    {b.info && (
                      <div className="muted tiny">{b.info.rssi ?? "?"} dBm · {b.info.fw ?? "?"}</div>
                    )}
                  </td>
                  <td>{fmt(b.lastSeenAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        disabled={!b.online}
                        title={b.online ? "" : "Placa offline"}
                        onClick={() => setPending(b)}
                      >
                        Liberar
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => setEditing(editing === b.deviceId ? null : b.deviceId)}
                      >
                        {b.registered ? "Editar" : "Cadastrar"}
                      </button>
                    </div>
                    {lastStatus && (
                      <div className="release-status">
                        <span className={`badge ${lastStatus}`}>{STATE_LABEL[lastStatus] ?? lastStatus}</span>
                        {cmd && (
                          <button type="button" className="linkish" onClick={() => setLogOf(logOf === b.deviceId ? null : b.deviceId)}>
                            {logOf === b.deviceId ? "Ocultar log" : "Log"}
                          </button>
                        )}
                      </div>
                    )}
                    {editing === b.deviceId && (
                      <BoardForm
                        board={b}
                        onSaved={() => {
                          setEditing(null);
                          load();
                        }}
                        onCancel={() => setEditing(null)}
                      />
                    )}
                    {logOf === b.deviceId && cmd && (
                      <ul className="event-log">
                        {cmd.events.map((e, i) => (
                          <li key={i}>{fmt(e.createdAt)} — <strong>{e.type}</strong> {e.detail}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
            {!boards.length && (
              <tr>
                <td colSpan={6}>Nenhuma placa detectada ainda. Ligue a ESP32 com o firmware gravado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pending && (
        <ConfirmDialog
          title="Liberar máquina"
          message={`Liberar a máquina "${displayName(pending)}" agora? A placa vai acionar a máquina uma vez.`}
          confirmLabel="Liberar"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const b = pending;
            setPending(null);
            void release(b);
          }}
        />
      )}
    </section>
  );
}

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, brl, kindLabel, type Kind, type Machine, type Price } from "../api";
import { useStores } from "../hooks";

export function Config() {
  const { stores, reload: reloadStores } = useStores();
  const [storeId, setStoreId] = useState("");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [error, setError] = useState("");
  const [newStore, setNewStore] = useState({ name: "", code: "" });
  const [newMachine, setNewMachine] = useState({ kind: "WASHER" as Kind, label: "", channel: 100, deviceId: "" });

  const current = storeId || stores[0]?.id || "";
  const load = useCallback(() => {
    if (!current) return;
    Promise.all([api<Machine[]>(`/machines?storeId=${current}`), api<Price[]>(`/prices?storeId=${current}`)])
      .then(([m, p]) => { setMachines(m); setPrices(p); })
      .catch((e) => setError(e.message));
  }, [current]);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); setError(""); load(); } catch (e) { setError((e as Error).message); }
  };
  const priceOf = (k: Kind) => prices.find((p) => p.kind === k)?.amountCents;

  const savePrice = (kind: Kind, value: string) =>
    run(() => api("/prices", { method: "PUT", body: { storeId: current, kind, amountCents: Math.round(Number(value.replace(",", ".")) * 100) } }));

  const addStore = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => { await api("/stores", { method: "POST", body: newStore }); setNewStore({ name: "", code: "" }); await reloadStores(); });
  };
  const addMachine = (e: FormEvent) => {
    e.preventDefault();
    void run(() => api("/machines", { method: "POST", body: { ...newMachine, storeId: current, channel: Number(newMachine.channel) } }));
  };

  return (
    <section>
      {error && <p className="error">{error}</p>}
      <form className="toolbar" onSubmit={addStore}>
        <strong>Nova loja</strong>
        <input placeholder="Nome" value={newStore.name} onChange={(e) => setNewStore({ ...newStore, name: e.target.value })} required />
        <input placeholder="Código" value={newStore.code} onChange={(e) => setNewStore({ ...newStore, code: e.target.value })} required />
        <button>Criar</button>
      </form>
      <div className="toolbar">
        <label>Loja
          <select value={current} onChange={(e) => setStoreId(e.target.value)}>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>
      {current && (
        <>
          <h3>Preços (R$)</h3>
          <div className="toolbar">
            {(["WASHER", "DRYER"] as Kind[]).map((k) => (
              <label key={k}>{kindLabel(k)}
                <input key={`${current}-${k}-${priceOf(k)}`} defaultValue={priceOf(k) !== undefined ? (priceOf(k)! / 100).toFixed(2) : ""} placeholder="0,00"
                  onBlur={(e) => e.target.value && savePrice(k, e.target.value)} />
              </label>
            ))}
          </div>
          <h3>Máquinas</h3>
          <table>
            <thead><tr><th>Nome</th><th>Tipo</th><th>Canal</th><th>Placa (device)</th><th>Preço próprio</th><th>Placa online</th><th>Ativa</th></tr></thead>
            <tbody>
              {machines.map((m) => (
                <tr key={m.id}>
                  <td>{m.label}</td><td>{kindLabel(m.kind)}</td>
                  <td><input className="narrow" type="number" min={100} max={1000} defaultValue={m.channel}
                    onBlur={(e) => Number(e.target.value) !== m.channel && run(() => api(`/machines/${m.id}`, { method: "PATCH", body: { channel: Number(e.target.value) } }))} /></td>
                  <td>{m.deviceId}</td>
                  <td><input className="narrow" placeholder={priceOf(m.kind) !== undefined ? brl(priceOf(m.kind)!) : "—"}
                    defaultValue={m.priceOverrideCents !== null ? (m.priceOverrideCents / 100).toFixed(2) : ""}
                    onBlur={(e) => run(() => api(`/machines/${m.id}`, { method: "PATCH", body: { priceOverrideCents: e.target.value ? Math.round(Number(e.target.value.replace(",", ".")) * 100) : null } }))} /></td>
                  <td>{m.online ? "Sim" : "Não"}</td>
                  <td><input type="checkbox" checked={m.active} onChange={(e) => run(() => api(`/machines/${m.id}`, { method: "PATCH", body: { active: e.target.checked } }))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <form className="toolbar" onSubmit={addMachine}>
            <strong>Nova máquina</strong>
            <select value={newMachine.kind} onChange={(e) => setNewMachine({ ...newMachine, kind: e.target.value as Kind })}>
              <option value="WASHER">Lava</option><option value="DRYER">Seca</option>
            </select>
            <input placeholder="Nome" value={newMachine.label} onChange={(e) => setNewMachine({ ...newMachine, label: e.target.value })} required />
            <input className="narrow" type="number" min={100} max={1000} value={newMachine.channel} onChange={(e) => setNewMachine({ ...newMachine, channel: Number(e.target.value) })} />
            <input placeholder="ID da placa" value={newMachine.deviceId} onChange={(e) => setNewMachine({ ...newMachine, deviceId: e.target.value })} required />
            <button>Adicionar</button>
          </form>
        </>
      )}
    </section>
  );
}

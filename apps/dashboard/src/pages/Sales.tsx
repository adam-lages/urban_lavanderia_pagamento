import { useCallback, useEffect, useState } from "react";
import { api, brl, type SalesReport } from "../api";
import { useStores } from "../hooks";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function Sales() {
  const { stores } = useStores();
  const [from, setFrom] = useState(isoDay(new Date(Date.now() - 29 * 864e5)));
  const [to, setTo] = useState(isoDay(new Date()));
  const [storeId, setStoreId] = useState("");
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const q = new URLSearchParams({
      from: new Date(`${from}T00:00:00-03:00`).toISOString(),
      to: new Date(new Date(`${to}T00:00:00-03:00`).getTime() + 864e5).toISOString(),
    });
    if (storeId) q.set("storeId", storeId);
    api<SalesReport>(`/reports/sales?${q}`).then((r) => { setReport(r); setError(""); }).catch((e) => setError(e.message));
  }, [from, to, storeId]);
  useEffect(load, [load]);

  const max = Math.max(1, ...(report?.byDay.map((d) => d.revenueCents) ?? []));
  const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? id;

  return (
    <section>
      <div className="toolbar">
        <label>De <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Até <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label>Loja
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Todas</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      {report && (
        <>
          <div className="kpis">
            <div className="card"><span>Faturamento</span><strong>{brl(report.totals.revenueCents)}</strong></div>
            <div className="card"><span>Pedidos pagos</span><strong>{report.totals.orders}</strong></div>
            <div className="card"><span>Lavagens</span><strong>{report.byKind.WASHER.count}</strong><small>{brl(report.byKind.WASHER.revenueCents)}</small></div>
            <div className="card"><span>Secagens</span><strong>{report.byKind.DRYER.count}</strong><small>{brl(report.byKind.DRYER.revenueCents)}</small></div>
          </div>
          <h3>Por dia</h3>
          <table>
            <thead><tr><th>Dia</th><th>Pedidos</th><th>Faturamento</th><th></th></tr></thead>
            <tbody>
              {report.byDay.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td><td>{d.orders}</td><td>{brl(d.revenueCents)}</td>
                  <td className="barcell"><div className="bar" style={{ width: `${(d.revenueCents / max) * 100}%` }} /></td>
                </tr>
              ))}
              {!report.byDay.length && <tr><td colSpan={4}>Sem vendas no período.</td></tr>}
            </tbody>
          </table>
          <h3>Por loja</h3>
          <table>
            <thead><tr><th>Loja</th><th>Pedidos</th><th>Faturamento</th></tr></thead>
            <tbody>
              {report.byStore.map((s) => <tr key={s.storeId}><td>{storeName(s.storeId)}</td><td>{s.orders}</td><td>{brl(s.revenueCents)}</td></tr>)}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

import { useState } from "react";
import { api, type Board, type Kind } from "../api";
import { useStores } from "../hooks";

export function BoardForm({ board, onSaved, onCancel }: { board: Board; onSaved: () => void; onCancel: () => void }) {
  const { stores } = useStores();
  const [name, setName] = useState(board.name ?? "");
  const [storeId, setStoreId] = useState(board.storeId ?? "");
  const [kind, setKind] = useState<Kind | "">(board.kind ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/boards/${board.deviceId}`, {
        method: "PATCH",
        body: { name: name.trim() || undefined, storeId: storeId || undefined, kind: kind || undefined },
      });
      setError("");
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="board-form">
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
      <div className="dialog-actions">
        <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>
        <button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Salvando…" : "Salvar"}</button>
      </div>
      {error && <span className="error">{error}</span>}
    </div>
  );
}

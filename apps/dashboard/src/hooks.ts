import { useCallback, useEffect, useState } from "react";
import { api, type Store } from "./api";

export function useStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState("");
  const reload = useCallback(() => api<Store[]>("/stores").then(setStores).catch((e) => setError(e.message)), []);
  useEffect(() => { void reload(); }, [reload]);
  return { stores, reload, error };
}

import { useCallback, useEffect, useState } from "react";
import { api, type Store } from "./api";

export function useStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(() => {
    setLoading(true);
    return api<Store[]>("/stores")
      .then(setStores)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { stores, reload, error, loading };
}

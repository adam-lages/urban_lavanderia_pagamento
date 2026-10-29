import { useEffect, useState } from "react";
import { api, type Customer, type CustomerPage } from "../../api";

export function useStoreCustomers(storeId: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  useEffect(() => {
    if (!storeId) {
      setCustomers([]);
      return;
    }
    api<CustomerPage>(`/customers?storeId=${storeId}&page=0&limit=100`)
      .then((data) => setCustomers(data.items ?? []))
      .catch(() => setCustomers([]));
  }, [storeId]);
  return customers;
}

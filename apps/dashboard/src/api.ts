export type Kind = "WASHER" | "DRYER";
export interface Store { id: string; name: string; code: string; address: string; active: boolean }
export interface Customer {
  id: string;
  name: string;
  birthDate: string;
  age: number;
  cpf: string;
  email: string;
  phone: string;
  blocked: boolean;
  storeId: string;
  storeName: string;
  createdAt: string;
}
export interface CustomerPage { items: Customer[]; total: number }
export type PayMethod = "CREDIT" | "DEBIT" | "PIX" | "VOUCHER";
export interface Sale {
  id: string;
  orderId: string;
  storeId: string;
  storeName: string;
  customerName: string;
  customerCpf: string;
  machineLabel: string;
  paidAt: string;
  amountCents: number;
  paymentMethod: PayMethod | null;
  couponCode: string;
  voucherCode: string;
  authCode: string;
  cardBrand: string;
  cardNumber: string;
}
export interface SalePage { items: Sale[]; total: number }
export type MachineStatus = "ONLINE" | "OFFLINE" | "IN_USE";
export interface Machine {
  id: string;
  storeId: string;
  storeName?: string;
  kind: Kind;
  label: string;
  code: string;
  channel: number;
  deviceId: string;
  priceOverrideCents: number | null;
  active: boolean;
  blocked: boolean;
  online?: boolean;
  status?: MachineStatus;
  ip?: string;
  lastSeenAt?: string;
  lastReleasedAt?: string;
  lastBlockedAt?: string;
}
export interface Price { id: string; storeId: string; kind: Kind; amountCents: number }
export interface Command { id: string; orderId: string; storeId: string; machineId: string; deviceId: string; channel: number; status: string; attempts: number; issuedAt: string; sentAt: string | null; doneAt: string | null; machineLabel?: string; storeName?: string }
export interface SalesReport {
  totals: { orders: number; revenueCents: number };
  byDay: Array<{ date: string; orders: number; revenueCents: number }>;
  byStore: Array<{ storeId: string; orders: number; revenueCents: number }>;
  byKind: Record<Kind, { count: number; revenueCents: number }>;
}

export interface Overview {
  period: { from: string; to: string };
  cycles: number;
  revenueCents: number;
  avgTicketCents: number;
  machines: Array<{ machineId: string; label: string; storeName: string; kind: Kind; cycles: number; revenueCents: number }>;
  byDay: Array<{ date: string; cycles: number; revenueCents: number }>;
  byWeek: Array<{ weekStart: string; cycles: number; revenueCents: number }>;
  byHour: Array<{ hour: number; cycles: number; revenueCents: number }>;
  kinds: { washers: number; dryers: number };
  recurrence: {
    customers: number;
    returning: number;
    anonymousOrders: number;
    buckets: Array<{ label: string; customers: number }>;
  };
  signups: { month: string; total: number; byDay: Array<{ date: string; count: number; cumulative: number }> };
}

const TOKEN_KEY = "lav_admin_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? "";
export const setToken = (t: string) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", authorization: `Bearer ${getToken()}` },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).message ?? (data as any).error ?? `Erro ${res.status}`);
  return data as T;
}

export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const kindLabel = (k: Kind) => (k === "WASHER" ? "Lava" : "Seca");
export const machineKindLabel = (k: Kind) => (k === "WASHER" ? "Lavadora" : "Secadora");
export const machineStatusLabel = (s: MachineStatus | undefined) =>
  s === "IN_USE" ? "EM USO" : s === "ONLINE" ? "ONLINE" : "OFFLINE";

export interface BoardInfo { fw?: string; ip?: string; rssi?: number; uptimeS?: number; driver?: string; freeHeap?: number }
export interface Board {
  deviceId: string; name: string | null; storeId: string | null; storeName: string | null; kind: Kind | null;
  registered: boolean; online: boolean; firstSeenAt: string; lastSeenAt: string | null; info: BoardInfo | null;
  lastCommand: { id: string; status: string; issuedAt: string; doneAt: string | null } | null;
}

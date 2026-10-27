import type { Queryable } from "./db.js";

const STORES: Array<{ id: string; name: string; code: string; address: string }> = [
  { id: "loja-maranguape-1", name: "Maranguape 1", code: "10000001", address: "Av. Dr. Cláudio José Gueiros Leite, 100 — Maranguape" },
  { id: "loja-parque-recife", name: "Parque Recife", code: "10000002", address: "Av. Recife, 200 — Parque Recife" },
  { id: "loja-algarve", name: "Algarve", code: "10000003", address: "Rua do Algarve, 50 — Imbiribeira" },
];

const CUSTOMERS: Array<{
  id: string; name: string; birthDate: string; cpf: string; email: string; phone: string; blocked?: boolean; createdAt: string;
}> = [
  { id: "cli-ana", name: "Ana Souza", birthDate: "1992-03-14", cpf: "52998224725", email: "ana.souza@email.com", phone: "5581981110001", createdAt: "2026-01-12T10:15:00.000Z" },
  { id: "cli-bruno", name: "Bruno Lima", birthDate: "1988-11-02", cpf: "39053344705", email: "bruno.lima@email.com", phone: "5581981110002", createdAt: "2026-02-03T14:40:00.000Z" },
  { id: "cli-carla", name: "Carla Mendes", birthDate: "1996-07-21", cpf: "11144477735", email: "carla.mendes@email.com", phone: "5581981110003", blocked: true, createdAt: "2026-02-18T09:05:00.000Z" },
  { id: "cli-diego", name: "Diego Alves", birthDate: "1984-01-09", cpf: "85351346891", email: "diego.alves@email.com", phone: "5581981110004", createdAt: "2026-03-01T16:22:00.000Z" },
  { id: "cli-elisa", name: "Elisa Rocha", birthDate: "2001-05-30", cpf: "12345678909", email: "elisa.rocha@email.com", phone: "5581981110005", createdAt: "2026-03-22T11:48:00.000Z" },
  { id: "cli-fabio", name: "Fábio Nunes", birthDate: "1979-09-17", cpf: "98765432100", email: "fabio.nunes@email.com", phone: "5581981110006", createdAt: "2026-04-08T08:10:00.000Z" },
  { id: "cli-gabi", name: "Gabriela Costa", birthDate: "1994-12-05", cpf: "19100000000", email: "gabriela.costa@email.com", phone: "5581981110007", createdAt: "2026-05-14T19:33:00.000Z" },
  { id: "cli-hugo", name: "Hugo Pereira", birthDate: "1990-08-28", cpf: "22233344405", email: "hugo.pereira@email.com", phone: "5581981110008", blocked: true, createdAt: "2026-06-02T13:00:00.000Z" },
];

const MACHINES: Array<{ id: string; storeId: string; kind: "WASHER" | "DRYER"; label: string; code: string; channel: number; deviceId: string }> = [
  { id: "m-mar-1", storeId: "loja-maranguape-1", kind: "WASHER", label: "Lavadora 1", code: "100001", channel: 100, deviceId: "esp-mar-1" },
  { id: "m-mar-2", storeId: "loja-maranguape-1", kind: "WASHER", label: "Lavadora 2", code: "100002", channel: 200, deviceId: "esp-mar-2" },
  { id: "m-mar-3", storeId: "loja-maranguape-1", kind: "DRYER", label: "Secadora 1", code: "100003", channel: 300, deviceId: "esp-mar-3" },
  { id: "m-par-1", storeId: "loja-parque-recife", kind: "WASHER", label: "Lavadora 1", code: "200001", channel: 100, deviceId: "esp-par-1" },
  { id: "m-par-2", storeId: "loja-parque-recife", kind: "DRYER", label: "Secadora 1", code: "200002", channel: 200, deviceId: "esp-par-2" },
  { id: "m-par-3", storeId: "loja-parque-recife", kind: "DRYER", label: "Secadora 2", code: "200003", channel: 300, deviceId: "esp-par-3" },
  { id: "m-alg-1", storeId: "loja-algarve", kind: "WASHER", label: "Lavadora 1", code: "300001", channel: 100, deviceId: "esp-alg-1" },
  { id: "m-alg-2", storeId: "loja-algarve", kind: "DRYER", label: "Secadora 1", code: "300002", channel: 200, deviceId: "esp-alg-2" },
];

export async function seedIfEmpty(db: Queryable, boardId: string | undefined = process.env.DEMO_BOARD_ID?.trim()): Promise<boolean> {
  const existing = await db.query("SELECT 1 FROM stores LIMIT 1");
  if (existing.rows.length) {
    await seedCustomersIfEmpty(db);
    await seedSalesIfEmpty(db);
    console.log("Banco já possui lojas; seed de lojas ignorado.");
    return false;
  }
  for (const s of STORES) {
    await db.query("INSERT INTO stores (id, name, code, address, created_at) VALUES ($1,$2,$3,$4,now())", [s.id, s.name, s.code, s.address]);
    await db.query(
      "INSERT INTO prices (id, store_id, kind, amount_cents, updated_at) VALUES ($1,$2,'WASHER',1800,now()),($3,$2,'DRYER',1200,now())",
      [`p-w-${s.id}`, s.id, `p-d-${s.id}`],
    );
  }
  for (const m of MACHINES) {
    await db.query(
      "INSERT INTO machines (id, store_id, kind, label, channel, device_id, code, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now())",
      [m.id, m.storeId, m.kind, m.label, m.channel, m.deviceId, m.code],
    );
  }
  if (boardId) {
    await db.query(
      "INSERT INTO devices (device_id, name, store_id, kind, first_seen_at) VALUES ($1,'Lavadora 1',$2,'WASHER',now()) ON CONFLICT (device_id) DO NOTHING",
      [boardId, "loja-maranguape-1"],
    );
    console.log(`Placa ${boardId} cadastrada como "Lavadora 1" (Maranguape 1).`);
  }
  await seedCustomersIfEmpty(db);
  await seedSalesIfEmpty(db);
  console.log("Seed criado: Maranguape 1, Parque Recife e Algarve.");
  return true;
}

export async function seedCustomersIfEmpty(db: Queryable): Promise<void> {
  const existing = await db.query("SELECT 1 FROM customers LIMIT 1");
  if (existing.rows.length) return;
  for (const c of CUSTOMERS) {
    await db.query(
      "INSERT INTO customers (id, name, birth_date, cpf, email, phone, blocked, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [c.id, c.name, c.birthDate, c.cpf, c.email, c.phone, Boolean(c.blocked), c.createdAt],
    );
  }
}

const SALES: Array<{
  id: string;
  storeId: string;
  customerId: string;
  machineId: string;
  amount: number;
  method: string;
  paidAt: string;
  coupon?: string;
  voucher?: string;
  auth?: string;
  brand?: string;
  card?: string;
}> = [
  { id: "sale-1", storeId: "loja-maranguape-1", customerId: "cli-ana", machineId: "m-mar-1", amount: 1800, method: "PIX", paidAt: "2026-09-02T13:10:00.000Z" },
  { id: "sale-2", storeId: "loja-maranguape-1", customerId: "cli-bruno", machineId: "m-mar-2", amount: 1800, method: "CREDIT", paidAt: "2026-09-05T16:40:00.000Z", coupon: "LAVA10", auth: "A1B2C3", brand: "Mastercard", card: "**** 4412" },
  { id: "sale-3", storeId: "loja-maranguape-1", customerId: "cli-ana", machineId: "m-mar-3", amount: 1200, method: "DEBIT", paidAt: "2026-09-12T11:05:00.000Z", auth: "D4E5F6", brand: "Visa", card: "**** 8890" },
  { id: "sale-4", storeId: "loja-parque-recife", customerId: "cli-diego", machineId: "m-par-1", amount: 1800, method: "CREDIT", paidAt: "2026-09-18T18:22:00.000Z", auth: "G7H8I9", brand: "Elo", card: "**** 1023" },
  { id: "sale-5", storeId: "loja-parque-recife", customerId: "cli-elisa", machineId: "m-par-2", amount: 1200, method: "PIX", paidAt: "2026-09-21T09:48:00.000Z", coupon: "SECA5" },
  { id: "sale-6", storeId: "loja-parque-recife", customerId: "cli-gabi", machineId: "m-par-3", amount: 1200, method: "VOUCHER", paidAt: "2026-10-01T14:15:00.000Z", voucher: "URB-200" },
  { id: "sale-7", storeId: "loja-algarve", customerId: "cli-fabio", machineId: "m-alg-1", amount: 1800, method: "DEBIT", paidAt: "2026-10-08T10:30:00.000Z", auth: "J1K2L3", brand: "Visa", card: "**** 5566" },
  { id: "sale-8", storeId: "loja-algarve", customerId: "cli-hugo", machineId: "m-alg-2", amount: 1200, method: "PIX", paidAt: "2026-10-15T19:00:00.000Z" },
];

export async function seedSalesIfEmpty(db: Queryable): Promise<void> {
  const existing = await db.query("SELECT 1 FROM orders LIMIT 1");
  if (existing.rows.length) return;
  for (const s of SALES) {
    await db.query(
      "INSERT INTO orders (id, store_id, status, total_cents, customer_id, coupon_code, voucher_code, created_at, paid_at) VALUES ($1,$2,'PAID',$3,$4,$5,$6,$7,$7)",
      [s.id, s.storeId, s.amount, s.customerId, s.coupon ?? null, s.voucher ?? null, s.paidAt],
    );
    const machine = MACHINES.find((m) => m.id === s.machineId);
    await db.query(
      "INSERT INTO order_items (id, order_id, machine_id, kind, price_cents) VALUES ($1,$2,$3,$4,$5)",
      [`item-${s.id}`, s.id, s.machineId, machine?.kind, s.amount],
    );
    await db.query(
      "INSERT INTO payments (id, order_id, provider, external_id, status, method, amount_cents, auth_code, card_brand, card_number, created_at) VALUES ($1,$2,'stone',$3,'APPROVED',$4,$5,$6,$7,$8,$9)",
      [`pay-${s.id}`, s.id, `ext-${s.id}`, s.method, s.amount, s.auth ?? null, s.brand ?? null, s.card ?? null, s.paidAt],
    );
  }
}

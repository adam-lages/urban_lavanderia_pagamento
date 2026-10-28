import type { Queryable } from "./db.js";
import { mulberry32, randomCustomers } from "./demo-random.js";
import { BASE_PRICE_CENTS, seedSalesIfEmpty } from "./demo-sales.js";
import { defaultCycleMinutes } from "./services/machines.js";
import { seedDefaultUsers } from "./services/users.js";

const STORES: Array<{
  id: string; name: string; legalName: string; code: string; address: string; cnpj: string; role: "FRANQUIA" | "FRANQUEADO";
  prefix: string; slug: string; washers: number; dryers: number;
}> = [
  { id: "loja-maranguape-1", name: "Maranguape 1", legalName: "Urban Lavanderia Maranguape Ltda", code: "10000001", address: "Av. Dr. Cláudio José Gueiros Leite, 100 — Maranguape", cnpj: "11222333000181", role: "FRANQUIA", prefix: "1", slug: "mar", washers: 3, dryers: 3 },
  { id: "loja-parque-recife", name: "Parque Recife", legalName: "Urban Lavanderia Parque Recife Ltda", code: "10000002", address: "Av. Recife, 200 — Parque Recife", cnpj: "33444555000181", role: "FRANQUIA", prefix: "2", slug: "par", washers: 2, dryers: 2 },
  { id: "loja-algarve", name: "Algarve", legalName: "Algarve Serviços de Lavanderia Ltda", code: "10000003", address: "Rua do Algarve, 50 — Imbiribeira", cnpj: "55666777000181", role: "FRANQUEADO", prefix: "3", slug: "alg", washers: 2, dryers: 2 },
];

const RANDOM_CUSTOMERS_PER_STORE = 50;
const BLOCKED_MACHINE_ID = "m-alg-4";
const UNREGISTERED_DEVICE = "esp-nova-sem-cadastro";

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

async function insertCustomer(
  db: Queryable,
  c: { id: string; name: string; birthDate: string; cpf: string; email: string; phone: string; blocked?: boolean; createdAt: string },
  storeId: string,
) {
  await db.query(
    "INSERT INTO customers (id, name, birth_date, cpf, email, phone, blocked, created_at, store_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [c.id, c.name, c.birthDate, c.cpf, c.email, c.phone, Boolean(c.blocked), c.createdAt, storeId],
  );
}

async function storeIds(db: Queryable) {
  return (await db.query("SELECT id FROM stores ORDER BY name")).rows.map((r) => r.id as string);
}

async function seedStoresIfEmpty(db: Queryable): Promise<boolean> {
  if ((await db.query("SELECT 1 FROM stores LIMIT 1")).rows.length) return false;
  for (const s of STORES) {
    await db.query(
      "INSERT INTO stores (id, name, legal_name, code, address, cnpj, role, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now())",
      [s.id, s.name, s.legalName, s.code, s.address, s.cnpj, s.role],
    );
    await db.query(
      "INSERT INTO prices (id, store_id, kind, amount_cents, updated_at) VALUES ($1,$2,'WASHER',$4,now()),($3,$2,'DRYER',$4,now())",
      [`p-w-${s.id}`, s.id, `p-d-${s.id}`, BASE_PRICE_CENTS],
    );
  }
  return true;
}

async function seedMachinesIfEmpty(db: Queryable) {
  if ((await db.query("SELECT 1 FROM machines LIMIT 1")).rows.length) return;
  for (const s of STORES) {
    const layout = [
      ...Array.from({ length: s.washers }, (_, i) => ({ kind: "WASHER" as const, label: `Lavadora ${i + 1}` })),
      ...Array.from({ length: s.dryers }, (_, i) => ({ kind: "DRYER" as const, label: `Secadora ${i + 1}` })),
    ];
    for (const [i, m] of layout.entries()) {
      await db.query(
        "INSERT INTO machines (id, store_id, kind, label, channel, device_id, code, created_at, cycle_minutes) VALUES ($1,$2,$3,$4,100,$5,$6,now(),$7)",
        [`m-${s.slug}-${i + 1}`, s.id, m.kind, m.label, `esp-${s.slug}-${i + 1}`, `${s.prefix}${String(i + 1).padStart(5, "0")}`, defaultCycleMinutes(m.kind)],
      );
    }
  }
  await db.query("UPDATE machines SET active = false, blocked_at = now() WHERE id = $1", [BLOCKED_MACHINE_ID]);
}

async function seedDevicesIfEmpty(db: Queryable, boardId: string | undefined, now: Date) {
  if (boardId) {
    await db.query("UPDATE machines SET device_id = $1 WHERE id = 'm-mar-1'", [boardId]);
  }
  if ((await db.query("SELECT 1 FROM devices LIMIT 1")).rows.length) return;
  const machines = (await db.query(
    "SELECT device_id, store_id, kind, label FROM machines WHERE device_id IS NOT NULL ORDER BY code",
  )).rows as Array<{ device_id: string; store_id: string; kind: string; label: string }>;
  for (const [i, m] of machines.entries()) {
    const seen = new Date(now.getTime() - i * 90_000);
    const info = JSON.stringify({ fw: "0.1.0", ip: `10.1.2.${10 + i}`, rssi: -55 - i, driver: "gpio" });
    await db.query(
      "INSERT INTO devices (device_id, name, store_id, kind, first_seen_at, last_seen_at, info) VALUES ($1,$2,$3,$4,$5,$5,$6) ON CONFLICT (device_id) DO NOTHING",
      [m.device_id, m.label, m.store_id, m.kind, seen, info],
    );
  }
  await db.query(
    "INSERT INTO devices (device_id, first_seen_at, last_seen_at) VALUES ($1,$2,$2) ON CONFLICT (device_id) DO NOTHING",
    [UNREGISTERED_DEVICE, now],
  );
}

export async function seedIfEmpty(
  db: Queryable,
  boardId: string | undefined = process.env.DEMO_BOARD_ID?.trim(),
  now: Date = new Date(),
): Promise<boolean> {
  const createdStores = await seedStoresIfEmpty(db);
  await seedDefaultUsers(db);
  await seedMachinesIfEmpty(db);
  await seedDevicesIfEmpty(db, boardId, now);
  await seedCustomersIfEmpty(db);
  await seedRandomCustomersIfEmpty(db, now);
  await seedSalesIfEmpty(db, now);
  if (createdStores) {
    console.log("Seed criado: 3 lavanderias, máquinas, placas, clientes e vendas de demonstração.");
  } else {
    console.log("Banco já possui lojas; seed preencheu só o que ainda estava vazio.");
  }
  return createdStores;
}

export async function seedCustomersIfEmpty(db: Queryable): Promise<void> {
  const existing = await db.query("SELECT 1 FROM customers LIMIT 1");
  if (existing.rows.length) return;
  const stores = await storeIds(db);
  if (!stores.length) return;
  for (const [i, c] of CUSTOMERS.entries()) await insertCustomer(db, c, stores[i % stores.length]!);
}

async function seedRandomCustomersIfEmpty(db: Queryable, now: Date) {
  if ((await db.query("SELECT 1 FROM customers WHERE id LIKE 'cli-demo-%' LIMIT 1")).rows.length) return;
  const stores = await storeIds(db);
  if (!stores.length) return;
  const used = new Set((await db.query("SELECT cpf FROM customers")).rows.map((r) => r.cpf as string));
  const from = new Date(Date.UTC(now.getUTCFullYear(), 4, 1, 12));
  const list = randomCustomers(mulberry32(20260502), RANDOM_CUSTOMERS_PER_STORE * STORES.length, used, from, now);
  for (const [i, c] of list.entries()) await insertCustomer(db, c, stores[i % stores.length]!);
}

import type { Queryable } from "./db.js";
import { mulberry32, randomCustomers } from "./demo-random.js";
import { BASE_PRICE_CENTS, seedSalesIfEmpty } from "./demo-sales.js";

const STORES: Array<{ id: string; name: string; code: string; address: string; prefix: string; slug: string; washers: number; dryers: number }> = [
  { id: "loja-maranguape-1", name: "Maranguape 1", code: "10000001", address: "Av. Dr. Cláudio José Gueiros Leite, 100 — Maranguape", prefix: "1", slug: "mar", washers: 3, dryers: 3 },
  { id: "loja-parque-recife", name: "Parque Recife", code: "10000002", address: "Av. Recife, 200 — Parque Recife", prefix: "2", slug: "par", washers: 2, dryers: 2 },
  { id: "loja-algarve", name: "Algarve", code: "10000003", address: "Rua do Algarve, 50 — Imbiribeira", prefix: "3", slug: "alg", washers: 2, dryers: 2 },
];

const RANDOM_CUSTOMERS_PER_STORE = 50;

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
) {
  await db.query(
    "INSERT INTO customers (id, name, birth_date, cpf, email, phone, blocked, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    [c.id, c.name, c.birthDate, c.cpf, c.email, c.phone, Boolean(c.blocked), c.createdAt],
  );
}

async function insertMachines(db: Queryable) {
  for (const s of STORES) {
    const layout = [
      ...Array.from({ length: s.washers }, (_, i) => ({ kind: "WASHER" as const, label: `Lavadora ${i + 1}` })),
      ...Array.from({ length: s.dryers }, (_, i) => ({ kind: "DRYER" as const, label: `Secadora ${i + 1}` })),
    ];
    for (const [i, m] of layout.entries()) {
      await db.query(
        "INSERT INTO machines (id, store_id, kind, label, channel, device_id, code, created_at) VALUES ($1,$2,$3,$4,100,$5,$6,now())",
        [`m-${s.slug}-${i + 1}`, s.id, m.kind, m.label, `esp-${s.slug}-${i + 1}`, `${s.prefix}${String(i + 1).padStart(5, "0")}`],
      );
    }
  }
}

export async function seedIfEmpty(
  db: Queryable,
  boardId: string | undefined = process.env.DEMO_BOARD_ID?.trim(),
  now: Date = new Date(),
): Promise<boolean> {
  const existing = await db.query("SELECT 1 FROM stores LIMIT 1");
  if (existing.rows.length) {
    await seedCustomersIfEmpty(db);
    await seedSalesIfEmpty(db, now);
    console.log("Banco já possui lojas; seed de lojas ignorado.");
    return false;
  }
  for (const s of STORES) {
    await db.query("INSERT INTO stores (id, name, code, address, created_at) VALUES ($1,$2,$3,$4,now())", [s.id, s.name, s.code, s.address]);
    await db.query(
      "INSERT INTO prices (id, store_id, kind, amount_cents, updated_at) VALUES ($1,$2,'WASHER',$4,now()),($3,$2,'DRYER',$4,now())",
      [`p-w-${s.id}`, s.id, `p-d-${s.id}`, BASE_PRICE_CENTS],
    );
  }
  await insertMachines(db);
  if (boardId) {
    await db.query(
      "INSERT INTO devices (device_id, name, store_id, kind, first_seen_at) VALUES ($1,'Lavadora 1',$2,'WASHER',now()) ON CONFLICT (device_id) DO NOTHING",
      [boardId, "loja-maranguape-1"],
    );
    console.log(`Placa ${boardId} cadastrada como "Lavadora 1" (Maranguape 1).`);
  }
  await seedCustomersIfEmpty(db);
  await seedRandomCustomers(db, now);
  await seedSalesIfEmpty(db, now);
  console.log("Seed criado: Maranguape 1, Parque Recife e Algarve, com clientes e vendas de demonstração.");
  return true;
}

export async function seedCustomersIfEmpty(db: Queryable): Promise<void> {
  const existing = await db.query("SELECT 1 FROM customers LIMIT 1");
  if (existing.rows.length) return;
  for (const c of CUSTOMERS) await insertCustomer(db, c);
}

async function seedRandomCustomers(db: Queryable, now: Date) {
  const used = new Set((await db.query("SELECT cpf FROM customers")).rows.map((r) => r.cpf as string));
  const from = new Date(Date.UTC(now.getUTCFullYear(), 4, 1, 12));
  const list = randomCustomers(mulberry32(20260502), RANDOM_CUSTOMERS_PER_STORE * STORES.length, used, from, now);
  for (const c of list) await insertCustomer(db, c);
}

import pg from "pg";
import { loadConfig } from "./config.js";
import { migrate, wrapPool } from "./db.js";

const config = loadConfig();
const db = wrapPool(new pg.Pool({ connectionString: config.databaseUrl }));
await migrate(db);

const existing = await db.query("SELECT 1 FROM stores LIMIT 1");
if (existing.rows.length) {
  console.log("Banco já possui lojas; seed ignorado.");
} else {
  const storeId = "loja-demo";
  await db.query("INSERT INTO stores (id, name, code, created_at) VALUES ($1,$2,$3,now())", [storeId, "Loja Demo", "DEMO"]);
  await db.query("INSERT INTO prices (id, store_id, kind, amount_cents, updated_at) VALUES ('p-w',$1,'WASHER',1800,now()),('p-d',$1,'DRYER',1200,now())", [storeId]);
  const machines: Array<[string, string, string, number]> = [
    ["m1", "WASHER", "Lavadora 1", 100],
    ["m2", "WASHER", "Lavadora 2", 200],
    ["m3", "DRYER", "Secadora 1", 300],
    ["m4", "DRYER", "Secadora 2", 400],
  ];
  for (const [id, kind, label, channel] of machines)
    await db.query(
      "INSERT INTO machines (id, store_id, kind, label, channel, device_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,now())",
      [id, storeId, kind, label, channel, `esp-${id}`],
    );
  console.log("Seed criado: loja-demo com 4 máquinas (devices esp-m1..esp-m4).");
}
await db.end();

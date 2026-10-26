import type { Queryable } from "./db.js";

/** Cria a loja demo se o banco estiver vazio. Devolve true se criou. */
export async function seedIfEmpty(db: Queryable, boardId: string | undefined = process.env.DEMO_BOARD_ID?.trim()): Promise<boolean> {
  const existing = await db.query("SELECT 1 FROM stores LIMIT 1");
  if (existing.rows.length) {
    console.log("Banco já possui lojas; seed ignorado.");
    return false;
  }
  const storeId = "loja-demo";
  await db.query("INSERT INTO stores (id, name, code, created_at) VALUES ($1,$2,$3,now())", [storeId, "Loja Demo", "DEMO"]);
  await db.query(
    "INSERT INTO prices (id, store_id, kind, amount_cents, updated_at) VALUES ('p-w',$1,'WASHER',1800,now()),('p-d',$1,'DRYER',1200,now())",
    [storeId],
  );
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
  if (boardId) {
    // Placa real de teste (ex.: esp-a4cf12345678, aparece no monitor serial): já nasce como "Lavadora 1".
    await db.query(
      "INSERT INTO devices (device_id, name, store_id, kind, first_seen_at) VALUES ($1,'Lavadora 1',$2,'WASHER',now()) ON CONFLICT (device_id) DO NOTHING",
      [boardId, storeId],
    );
    console.log(`Placa ${boardId} cadastrada como "Lavadora 1" (loja-demo).`);
  }
  console.log("Seed criado: loja-demo com 4 máquinas (devices esp-m1..esp-m4).");
  return true;
}

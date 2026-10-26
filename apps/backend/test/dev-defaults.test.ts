import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { migrate, openDb } from "../src/db.js";
import { seedIfEmpty } from "../src/demo-seed.js";
import { startEmbeddedBroker } from "../src/mqtt-broker.js";

describe("dev embutido", () => {
  it("liga banco e MQTT embutidos por padrão", () => {
    const c = loadConfig({});
    expect(c.embeddedDb).toBe(true);
    expect(c.embeddedMqtt).toBe(true);
  });

  it("desliga o embutido quando o Docker/produção pede", () => {
    const c = loadConfig({ DATABASE_EMBEDDED: "false", MQTT_EMBEDDED: "false" });
    expect(c.embeddedDb).toBe(false);
    expect(c.embeddedMqtt).toBe(false);
  });

  it("abre pg-mem, migra e cria a loja demo", async () => {
    const db = openDb(loadConfig({ DATABASE_EMBEDDED: "true" }));
    await migrate(db);
    expect(await seedIfEmpty(db)).toBe(true);
    expect(await seedIfEmpty(db)).toBe(false);
    const stores = await db.query("SELECT code FROM stores");
    expect(stores.rows.map((r) => r.code)).toEqual(["DEMO"]);
    await db.end();
  });

  it("cadastra a placa de teste como Lavadora 1 quando DEMO_BOARD_ID é informado", async () => {
    const db = openDb(loadConfig({ DATABASE_EMBEDDED: "true" }));
    await migrate(db);
    await seedIfEmpty(db, "esp-aabbccddeeff");
    const r = await db.query("SELECT name, kind FROM devices WHERE device_id = 'esp-aabbccddeeff'");
    expect(r.rows[0]).toMatchObject({ name: "Lavadora 1", kind: "WASHER" });
    await db.end();
  });

  it("sobe o broker MQTT em porta livre", async () => {
    const broker = await startEmbeddedBroker({ host: "127.0.0.1", port: 0 });
    expect(broker.url).toMatch(/^mqtt:\/\/127\.0\.0\.1:\d+$/);
    await broker.close();
  });
});

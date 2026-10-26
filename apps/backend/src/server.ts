import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { migrate, openDb } from "./db.js";
import { seedIfEmpty } from "./demo-seed.js";
import { loadRootEnv } from "./env-file.js";
import { MqttGateway } from "./gateway.js";
import { startEmbeddedBroker, type EmbeddedBroker } from "./mqtt-broker.js";

loadRootEnv();
const config = loadConfig();
const db = openDb(config);
await migrate(db);
await seedIfEmpty(db);

let broker: EmbeddedBroker | undefined;
if (config.embeddedMqtt) {
  try {
    broker = await startEmbeddedBroker({ host: config.mqttListenHost, port: config.mqttListenPort });
  } catch (err: any) {
    const hint =
      err?.code === "EADDRINUSE"
        ? ` Porta ${config.mqttListenPort} ocupada. Feche o Mosquitto/Docker ou mude MQTT_PORT.`
        : "";
    throw new Error(`Não deu para subir o MQTT embutido.${hint}`, { cause: err });
  }
  console.log(`MQTT embutido ouvindo em ${config.mqttListenHost}:${broker.port} (dashboard/simulador: mqtt://localhost:${broker.port})`);
}

const mqttUrl = broker?.url ?? config.mqttUrl;
const gateway = await MqttGateway.connect(mqttUrl, { username: config.mqttUsername, password: config.mqttPassword });
const app = await buildApp({ db, gateway, config });
await app.listen({ port: config.port, host: "0.0.0.0" });
console.log(
  `backend ouvindo na porta ${config.port}` +
    (config.embeddedDb ? " (banco em memória — some ao fechar o terminal)" : ` (Postgres ${config.databaseUrl})`),
);

async function shutdown() {
  await app.close().catch(() => undefined);
  await gateway.close().catch(() => undefined);
  await broker?.close().catch(() => undefined);
  await db.end().catch(() => undefined);
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

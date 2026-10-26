import pg from "pg";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { migrate, wrapPool } from "./db.js";
import { MqttGateway } from "./gateway.js";

const config = loadConfig();
const db = wrapPool(new pg.Pool({ connectionString: config.databaseUrl }));
await migrate(db);
const gateway = await MqttGateway.connect(config.mqttUrl, { username: config.mqttUsername, password: config.mqttPassword });
const app = await buildApp({ db, gateway, config });
await app.listen({ port: config.port, host: "0.0.0.0" });
console.log(`backend ouvindo na porta ${config.port}`);

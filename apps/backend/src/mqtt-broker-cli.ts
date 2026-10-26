import { loadConfig } from "./config.js";
import { loadRootEnv } from "./env-file.js";
import { startEmbeddedBroker } from "./mqtt-broker.js";

loadRootEnv();
const config = loadConfig();
const broker = await startEmbeddedBroker({ host: config.mqttListenHost, port: config.mqttListenPort });
console.log(`MQTT embutido em ${config.mqttListenHost}:${broker.port}`);
console.log(`Outros programas: mqtt://localhost:${broker.port}`);
console.log("Deixe este terminal aberto. Ctrl+C para parar.");
process.once("SIGINT", () => void broker.close().then(() => process.exit(0)));
process.once("SIGTERM", () => void broker.close().then(() => process.exit(0)));

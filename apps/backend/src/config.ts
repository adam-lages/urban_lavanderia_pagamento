export interface Config {
  port: number;
  databaseUrl: string;
  /** Banco Postgres em memória (pg-mem). Padrão no Node local. Docker/produção desliga. */
  embeddedDb: boolean;
  mqttUrl: string;
  mqttUsername?: string;
  mqttPassword?: string;
  /** Broker MQTT (Aedes) no próprio processo. Padrão no Node local. */
  embeddedMqtt: boolean;
  mqttListenHost: string;
  mqttListenPort: number;
  adminToken: string;
  posToken: string;
  commandTtlSeconds: number;
  ackTimeoutSeconds: number;
  requireDeviceOnline: boolean;
  enableSimulatedPayments: boolean;
}

function flag(env: NodeJS.ProcessEnv, key: string, defaultTrue: boolean): boolean {
  const raw = env[key];
  if (raw === undefined || raw === "") return defaultTrue;
  return raw !== "false" && raw !== "0";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    databaseUrl: env.DATABASE_URL ?? "postgres://lav:lav@localhost:5432/lav",
    embeddedDb: flag(env, "DATABASE_EMBEDDED", true),
    mqttUrl: env.MQTT_URL ?? "mqtt://localhost:1883",
    mqttUsername: env.MQTT_USERNAME || undefined,
    mqttPassword: env.MQTT_PASSWORD || undefined,
    embeddedMqtt: flag(env, "MQTT_EMBEDDED", true),
    mqttListenHost: env.MQTT_LISTEN_HOST || "0.0.0.0",
    mqttListenPort: Number(env.MQTT_PORT ?? 1883),
    adminToken: env.ADMIN_TOKEN ?? "dev-admin-token",
    posToken: env.POS_TOKEN ?? "dev-pos-token",
    commandTtlSeconds: Number(env.COMMAND_TTL_SECONDS ?? 60),
    ackTimeoutSeconds: Number(env.ACK_TIMEOUT_SECONDS ?? 60),
    requireDeviceOnline: (env.REQUIRE_DEVICE_ONLINE ?? "true") === "true",
    enableSimulatedPayments: (env.ENABLE_SIMULATED_PAYMENTS ?? "true") === "true",
  };
}

export interface Config {
  port: number;
  databaseUrl: string;
  mqttUrl: string;
  mqttUsername?: string;
  mqttPassword?: string;
  adminToken: string;
  posToken: string;
  commandTtlSeconds: number;
  ackTimeoutSeconds: number;
  requireDeviceOnline: boolean;
  enableSimulatedPayments: boolean;
}

export function loadConfig(env = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    databaseUrl: env.DATABASE_URL ?? "postgres://lav:lav@localhost:5432/lav",
    mqttUrl: env.MQTT_URL ?? "mqtt://localhost:1883",
    mqttUsername: env.MQTT_USERNAME || undefined,
    mqttPassword: env.MQTT_PASSWORD || undefined,
    adminToken: env.ADMIN_TOKEN ?? "dev-admin-token",
    posToken: env.POS_TOKEN ?? "dev-pos-token",
    commandTtlSeconds: Number(env.COMMAND_TTL_SECONDS ?? 60),
    ackTimeoutSeconds: Number(env.ACK_TIMEOUT_SECONDS ?? 60),
    requireDeviceOnline: (env.REQUIRE_DEVICE_ONLINE ?? "true") === "true",
    enableSimulatedPayments: (env.ENABLE_SIMULATED_PAYMENTS ?? "true") === "true",
  };
}

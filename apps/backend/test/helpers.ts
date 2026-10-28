import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { migrate, wrapPool } from "../src/db.js";
import { MqttGateway } from "../src/gateway.js";
import { startEmbeddedBroker } from "../src/mqtt-broker.js";
import { DeviceSimulator, type DeviceOptions } from "@lav/simulator";
import { newDb } from "pg-mem";

export const ADMIN = { authorization: "Bearer test-admin" };
export const POS = { authorization: "Bearer test-pos" };

export async function startBroker() {
  return startEmbeddedBroker({ host: "127.0.0.1", port: 0 });
}

export async function startStack(overrides: Record<string, string> = {}) {
  const broker = await startBroker();
  const pg = newDb().adapters.createPg();
  const db = wrapPool(new pg.Pool());
  await migrate(db);
  const config = {
    ...loadConfig({
      ADMIN_TOKEN: "test-admin",
      POS_TOKEN: "test-pos",
      MQTT_URL: broker.url,
      MQTT_EMBEDDED: "false",
      DATABASE_EMBEDDED: "false",
      COMMAND_TTL_SECONDS: "60",
      ACK_TIMEOUT_SECONDS: "60",
      ...overrides,
    }),
  };
  const gateway = await MqttGateway.connect(broker.url);
  const app = await buildApp({ db, gateway, config });
  const devices: DeviceSimulator[] = [];
  return {
    app, db, gateway, broker, config, devices,
    async addDevice(deviceId: string, opts: Partial<DeviceOptions> = {}) {
      const d = new DeviceSimulator({ url: broker.url, deviceId, pulseMs: 0, ...opts });
      await d.start();
      devices.push(d);
      await waitFor(() => gateway.isOnline(deviceId));
      return d;
    },
    async close() {
      await Promise.all(devices.map((d) => d.crash()));
      await app.close();
      await gateway.close();
      await broker.close();
    },
  };
}

export async function waitFor(fn: () => boolean | Promise<boolean>, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("waitFor: timeout");
}

export type Stack = Awaited<ReturnType<typeof startStack>>;

export async function seed(s: Stack) {
  const store = (await s.app.inject({
    method: "POST",
    url: "/stores",
    headers: ADMIN,
    payload: { name: "Loja 1", legalName: "Razão Social", code: "10000099", cnpj: "19100000000191", role: "FRANQUIA" },
  })).json();
  await s.app.inject({ method: "PUT", url: "/prices", headers: ADMIN, payload: { storeId: store.id, kind: "WASHER", amountCents: 1800 } });
  await s.app.inject({ method: "PUT", url: "/prices", headers: ADMIN, payload: { storeId: store.id, kind: "DRYER", amountCents: 1200 } });
  const mk = async (kind: string, label: string, channel: number, deviceId: string) =>
    (await s.app.inject({ method: "POST", url: "/machines", headers: ADMIN, payload: { storeId: store.id, kind, label, channel, deviceId } })).json();
  const washer = await mk("WASHER", "Lavadora 1", 100, "esp-1");
  const dryer = await mk("DRYER", "Secadora 1", 500, "esp-2");
  return { store, washer, dryer };
}

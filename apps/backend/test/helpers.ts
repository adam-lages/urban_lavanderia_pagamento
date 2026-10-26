import net from "node:net";
import { newDb } from "pg-mem";
import aedes from "aedes";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { migrate, wrapPool } from "../src/db.js";
import { MqttGateway } from "../src/gateway.js";
import { DeviceSimulator, type DeviceOptions } from "@lav/simulator";

export const ADMIN = { authorization: "Bearer test-admin" };
export const POS = { authorization: "Bearer test-pos" };

export async function startBroker() {
  const broker = (aedes as any)();
  const server = net.createServer(broker.handle);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const url = `mqtt://127.0.0.1:${(server.address() as net.AddressInfo).port}`;
  return {
    url,
    async close() {
      await new Promise<void>((r) => broker.close(() => r()));
      server.close();
    },
  };
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
  const store = (await s.app.inject({ method: "POST", url: "/stores", headers: ADMIN, payload: { name: "Loja 1", code: "L1" } })).json();
  await s.app.inject({ method: "PUT", url: "/prices", headers: ADMIN, payload: { storeId: store.id, kind: "WASHER", amountCents: 1800 } });
  await s.app.inject({ method: "PUT", url: "/prices", headers: ADMIN, payload: { storeId: store.id, kind: "DRYER", amountCents: 1200 } });
  const mk = async (kind: string, label: string, channel: number, deviceId: string) =>
    (await s.app.inject({ method: "POST", url: "/machines", headers: ADMIN, payload: { storeId: store.id, kind, label, channel, deviceId } })).json();
  const washer = await mk("WASHER", "Lavadora 1", 100, "esp-1");
  const dryer = await mk("DRYER", "Secadora 1", 500, "esp-2");
  return { store, washer, dryer };
}

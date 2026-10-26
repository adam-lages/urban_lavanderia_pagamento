import { DeviceSimulator } from "./device.js";

const url = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const ids = (process.env.DEVICE_IDS ?? "esp-m1,esp-m2,esp-m3,esp-m4").split(",").map((s) => s.trim()).filter(Boolean);
const pulseMs = Number(process.env.PULSE_MS ?? 500);

const devices = ids.map(
  (deviceId) =>
    new DeviceSimulator({
      url,
      deviceId,
      pulseMs,
      username: process.env.MQTT_USERNAME || undefined,
      password: process.env.MQTT_PASSWORD || undefined,
      dropAcks: process.env.DROP_ACKS === "true",
      failAll: process.env.FAIL_ALL === "true",
      log: (m) => console.log(new Date().toISOString(), m),
    }),
);
await Promise.all(devices.map((d) => d.start()));
console.log(`Simulador com ${devices.length} placa(s): ${ids.join(", ")}`);

process.on("SIGINT", async () => {
  await Promise.all(devices.map((d) => d.stop()));
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await Promise.all(devices.map((d) => d.stop()));
  process.exit(0);
});

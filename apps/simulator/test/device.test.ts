import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import aedes from "aedes";
import mqtt from "mqtt";
import { topics } from "@lav/protocol";
import { DeviceSimulator } from "../src/device.js";

const closers: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const c of closers.splice(0)) await c();
});

async function setup() {
  const broker = (aedes as any)();
  const server = net.createServer(broker.handle);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const url = `mqtt://127.0.0.1:${(server.address() as net.AddressInfo).port}`;
  const probe = mqtt.connect(url);
  const acks: any[] = [];
  await new Promise<void>((r) => probe.on("connect", () => r()));
  probe.subscribe(topics.ack("d1"));
  probe.on("message", (_t, p) => acks.push(JSON.parse(p.toString())));
  const dev = new DeviceSimulator({ url, deviceId: "d1", pulseMs: 0 });
  await dev.start();
  closers.push(async () => {
    await dev.crash();
    await probe.endAsync();
    await new Promise<void>((r) => broker.close(() => r()));
    server.close();
  });
  const send = (m: object) => probe.publish(topics.cmd("d1"), JSON.stringify(m));
  const wait = async (n: number) => {
    for (let i = 0; i < 100 && acks.length < n; i++) await new Promise((r) => setTimeout(r, 20));
  };
  return { dev, acks, send, wait };
}

const future = () => new Date(Date.now() + 60_000).toISOString();

describe("DeviceSimulator", () => {
  it("executa uma vez e confirma repetições sem novo pulso", async () => {
    const { dev, acks, send, wait } = await setup();
    const cmd = { commandId: "c1", channel: 300, issuedAt: new Date().toISOString(), expiresAt: future() };
    send(cmd);
    send(cmd);
    await wait(2);
    expect(dev.pulses).toHaveLength(1);
    expect(acks.map((a) => a.status)).toEqual(["done", "done"]);
  });

  it("rejeita comando expirado e canal inválido", async () => {
    const { dev, acks, send, wait } = await setup();
    send({ commandId: "c2", channel: 100, issuedAt: "x", expiresAt: new Date(Date.now() - 1000).toISOString() });
    send({ commandId: "c3", channel: 5, issuedAt: "x", expiresAt: future() });
    await wait(2);
    expect(dev.pulses).toHaveLength(0);
    expect(acks.map((a) => a.reason)).toEqual(["expired", "invalid_channel"]);
  });
});

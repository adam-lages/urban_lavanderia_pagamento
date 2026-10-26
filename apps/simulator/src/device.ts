import { existsSync, readFileSync, writeFileSync } from "node:fs";
import mqtt, { type MqttClient } from "mqtt";
import { topics, type AckMessage, type DeviceInfoMessage, type ReleaseCommandMessage } from "@lav/protocol";

export interface DeviceOptions {
  url: string;
  deviceId: string;
  username?: string;
  password?: string;
  /** Tempo simulado do pulso no canal (ms). */
  pulseMs?: number;
  /** Se true, executa mas nunca responde (testa UNCONFIRMED). */
  dropAcks?: boolean;
  /** Se true, rejeita todo comando (testa FAILED). */
  failAll?: boolean;
  /** Intervalo do heartbeat em tópico `info` (ms). 0 desliga. Padrão: 30000. */
  infoIntervalMs?: number;
  /** Arquivo para persistir commandIds executados (simula memória não volátil). */
  statePath?: string;
  log?: (msg: string) => void;
}

/** Simula uma ESP32: LWT, presença, validação de expiração, dedupe por commandId, ack. */
export class DeviceSimulator {
  /** Pulsos efetivamente executados (um por commandId novo). */
  readonly pulses: Array<{ commandId: string; channel: number; at: Date }> = [];
  private executed = new Set<string>();
  private client?: MqttClient;
  private infoTimer?: NodeJS.Timeout;
  private startedAt = Date.now();
  private log: (m: string) => void;

  constructor(private opts: DeviceOptions) {
    this.log = opts.log ?? (() => undefined);
    if (opts.statePath && existsSync(opts.statePath)) {
      this.executed = new Set(JSON.parse(readFileSync(opts.statePath, "utf8")) as string[]);
    }
  }

  get deviceId() {
    return this.opts.deviceId;
  }

  async start(): Promise<void> {
    const { deviceId } = this.opts;
    const client = mqtt.connect(this.opts.url, {
      clientId: `sim-${deviceId}`,
      username: this.opts.username,
      password: this.opts.password,
      clean: false,
      reconnectPeriod: 1000,
      will: { topic: topics.status(deviceId), payload: Buffer.from("offline"), qos: 1, retain: true },
    });
    this.client = client;
    client.on("message", (_t, payload) => void this.onCommand(payload.toString()));
    client.on("connect", () => {
      client.subscribe(topics.cmd(deviceId), { qos: 1 });
      client.publish(topics.status(deviceId), "online", { qos: 1, retain: true });
      this.publishInfo();
      this.log(`[${deviceId}] online`);
    });
    const every = this.opts.infoIntervalMs ?? 30_000;
    if (every > 0) {
      this.infoTimer = setInterval(() => this.publishInfo(), every);
      this.infoTimer.unref();
    }
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("error", reject);
    });
  }

  private async onCommand(raw: string) {
    let cmd: ReleaseCommandMessage;
    try {
      cmd = JSON.parse(raw);
    } catch {
      return;
    }
    if (!cmd?.commandId) return;
    if (this.executed.has(cmd.commandId)) {
      this.log(`[${this.deviceId}] repetido ${cmd.commandId}; reenviando done sem pulso`);
      this.ack({ commandId: cmd.commandId, status: "done" });
      return;
    }
    if (this.opts.failAll) return this.ack({ commandId: cmd.commandId, status: "rejected", reason: "falha simulada" });
    if (new Date(cmd.expiresAt) <= new Date())
      return this.ack({ commandId: cmd.commandId, status: "rejected", reason: "expired" });
    if (!Number.isInteger(cmd.channel) || cmd.channel < 100 || cmd.channel > 1000)
      return this.ack({ commandId: cmd.commandId, status: "rejected", reason: "invalid_channel" });

    this.executed.add(cmd.commandId);
    if (this.opts.statePath) writeFileSync(this.opts.statePath, JSON.stringify([...this.executed]));
    const pulseMs = this.opts.pulseMs ?? 200;
    if (pulseMs > 0) await new Promise((r) => setTimeout(r, pulseMs));
    this.pulses.push({ commandId: cmd.commandId, channel: cmd.channel, at: new Date() });
    this.log(`[${this.deviceId}] PULSO canal ${cmd.channel} (cmd ${cmd.commandId})`);
    this.ack({ commandId: cmd.commandId, status: "done" });
  }

  private publishInfo() {
    const info: DeviceInfoMessage = {
      fw: "simulator",
      ip: "127.0.0.1",
      rssi: -55,
      uptimeS: Math.floor((Date.now() - this.startedAt) / 1000),
      driver: "sim",
    };
    this.client?.publish(topics.info(this.deviceId), JSON.stringify(info), { qos: 0 });
  }

  private ack(msg: AckMessage) {
    if (this.opts.dropAcks) return;
    this.client?.publish(topics.ack(this.deviceId), JSON.stringify(msg), { qos: 1 });
  }

  /** Desliga de forma limpa e publica offline. */
  async stop(): Promise<void> {
    clearInterval(this.infoTimer);
    if (!this.client) return;
    await new Promise<void>((resolve) =>
      this.client!.publish(topics.status(this.deviceId), "offline", { qos: 1, retain: true }, () => resolve()),
    );
    await this.client.endAsync();
  }

  /** Simula queda de energia/Wi-Fi: corta sem enviar offline (o broker dispara o LWT). */
  async crash(): Promise<void> {
    clearInterval(this.infoTimer);
    await this.client?.endAsync(true);
  }
}

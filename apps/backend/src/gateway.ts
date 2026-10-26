import mqtt, { type MqttClient } from "mqtt";
import {
  topics,
  deviceIdFromTopic,
  type AckMessage,
  type PresenceStatus,
  type ReleaseCommandMessage,
} from "@lav/protocol";

export interface DeviceGateway {
  publishCommand(deviceId: string, msg: ReleaseCommandMessage): Promise<void>;
  isOnline(deviceId: string): boolean;
  onAck(handler: (deviceId: string, ack: AckMessage) => void): void;
  onPresence(handler: (deviceId: string, status: PresenceStatus) => void): void;
  close(): Promise<void>;
}

export class MqttGateway implements DeviceGateway {
  private presence = new Map<string, PresenceStatus>();
  private ackHandlers: Array<(d: string, a: AckMessage) => void> = [];
  private presenceHandlers: Array<(d: string, s: PresenceStatus) => void> = [];

  private constructor(private client: MqttClient) {}

  static async connect(url: string, opts: { username?: string; password?: string } = {}) {
    const client = mqtt.connect(url, {
      clientId: `lav-backend-${Math.random().toString(16).slice(2, 8)}`,
      username: opts.username,
      password: opts.password,
      reconnectPeriod: 2000,
      clean: false,
    });
    const gw = new MqttGateway(client);
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("error", reject);
    });
    client.on("connect", () => {
      client.subscribe([topics.ackWildcard, topics.statusWildcard], { qos: 1 });
    });
    client.subscribe([topics.ackWildcard, topics.statusWildcard], { qos: 1 });
    client.on("message", (topic, payload) => gw.handle(topic, payload.toString()));
    return gw;
  }

  private handle(topic: string, payload: string) {
    const deviceId = deviceIdFromTopic(topic);
    if (!deviceId) return;
    if (topic.endsWith("/status")) {
      const status: PresenceStatus = payload.trim() === "online" ? "online" : "offline";
      this.presence.set(deviceId, status);
      this.presenceHandlers.forEach((h) => h(deviceId, status));
    } else if (topic.endsWith("/ack")) {
      try {
        const ack = JSON.parse(payload) as AckMessage;
        if (ack && typeof ack.commandId === "string") this.ackHandlers.forEach((h) => h(deviceId, ack));
      } catch {
        /* payload inválido é ignorado */
      }
    }
  }

  publishCommand(deviceId: string, msg: ReleaseCommandMessage) {
    return new Promise<void>((resolve, reject) => {
      this.client.publish(topics.cmd(deviceId), JSON.stringify(msg), { qos: 1 }, (err) =>
        err ? reject(err) : resolve(),
      );
    });
  }
  isOnline(deviceId: string) {
    return this.presence.get(deviceId) === "online";
  }
  onAck(h: (d: string, a: AckMessage) => void) {
    this.ackHandlers.push(h);
  }
  onPresence(h: (d: string, s: PresenceStatus) => void) {
    this.presenceHandlers.push(h);
  }
  async close() {
    await this.client.endAsync();
  }
}

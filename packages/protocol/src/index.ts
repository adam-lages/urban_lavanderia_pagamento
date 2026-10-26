/** Contrato MQTT entre backend e placa (ESP32 real ou simulador). */

export const MIN_CHANNEL = 100;
export const MAX_CHANNEL = 1000;

export const topics = {
  /** backend -> placa */
  cmd: (deviceId: string) => `lav/${deviceId}/cmd`,
  /** placa -> backend */
  ack: (deviceId: string) => `lav/${deviceId}/ack`,
  /** placa -> backend, retained; "online"/"offline" (offline via LWT) */
  status: (deviceId: string) => `lav/${deviceId}/status`,
  /** placa -> backend, heartbeat periódico (JSON `DeviceInfoMessage`) */
  info: (deviceId: string) => `lav/${deviceId}/info`,
  /** placa -> debug: quadros RX da serial da máquina em hex (JSON {t,n,hex}); só driver serial */
  debugRx: (deviceId: string) => `lav/${deviceId}/debug/rx`,
  /** debug -> placa: {"hex":"AA BB","confirm":"SEND"}; ignorado, a menos que o firmware tenha SERIAL_DEBUG_TX=1 */
  debugCmd: (deviceId: string) => `lav/${deviceId}/debug/cmd`,
  ackWildcard: "lav/+/ack",
  infoWildcard: "lav/+/info",
  statusWildcard: "lav/+/status",
} as const;

export interface ReleaseCommandMessage {
  commandId: string;
  channel: number;
  issuedAt: string;
  expiresAt: string;
}

export type AckStatus = "done" | "rejected";

export interface AckMessage {
  commandId: string;
  status: AckStatus;
  reason?: string;
}

export interface DeviceInfoMessage {
  fw?: string;
  ip?: string;
  rssi?: number;
  uptimeS?: number;
  driver?: string;
  freeHeap?: number;
}

/** Canal usado em liberações manuais pelo dashboard (placa dedicada a uma máquina). */
export const MANUAL_CHANNEL = 100;

export type PresenceStatus = "online" | "offline";

export function deviceIdFromTopic(topic: string): string | null {
  const parts = topic.split("/");
  return parts.length === 3 && parts[0] === "lav" ? parts[1]! : null;
}

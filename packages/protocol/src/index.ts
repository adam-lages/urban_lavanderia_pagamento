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
  ackWildcard: "lav/+/ack",
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

export type PresenceStatus = "online" | "offline";

export function deviceIdFromTopic(topic: string): string | null {
  const parts = topic.split("/");
  return parts.length === 3 && parts[0] === "lav" ? parts[1]! : null;
}

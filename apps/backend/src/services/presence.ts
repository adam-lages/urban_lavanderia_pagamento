import { randomUUID } from "node:crypto";
import type { Queryable } from "../db.js";
import { HttpError } from "../errors.js";

export type PresenceState = "online" | "offline";

export interface PresenceSegment { status: PresenceState; from: string; to: string }

export interface MachinePresence {
  machineId: string;
  label: string;
  kind: "WASHER" | "DRYER";
  deviceId: string;
  onlineMs: number;
  offlineMs: number;
  segments: PresenceSegment[];
}

export function buildSegments(initial: PresenceState, events: Array<{ status: PresenceState; at: Date }>, from: Date, to: Date) {
  const segments: PresenceSegment[] = [];
  let status = initial;
  let start = from;
  for (const e of events) {
    if (e.at <= from || e.at > to || e.status === status) continue;
    if (e.at > start) segments.push({ status, from: start.toISOString(), to: e.at.toISOString() });
    status = e.status;
    start = e.at;
  }
  if (to > start) segments.push({ status, from: start.toISOString(), to: to.toISOString() });
  return segments;
}

const durationOf = (segments: PresenceSegment[], status: PresenceState) =>
  segments.filter((s) => s.status === status).reduce((t, s) => t + Date.parse(s.to) - Date.parse(s.from), 0);

export class PresenceService {
  constructor(private db: Queryable, private now: () => Date = () => new Date()) {}

  async record(deviceId: string, status: PresenceState): Promise<void> {
    const last = (await this.db.query(
      "SELECT status FROM device_presence_events WHERE device_id = $1 ORDER BY at DESC LIMIT 1",
      [deviceId],
    )).rows[0];
    if (last?.status === status) return;
    await this.db.query(
      "INSERT INTO device_presence_events (id, device_id, status, at) VALUES ($1,$2,$3,$4)",
      [randomUUID(), deviceId, status, this.now()],
    );
  }

  async history(storeId: string, hours: number): Promise<{ from: string; to: string; machines: MachinePresence[] }> {
    if (!(await this.db.query("SELECT 1 FROM stores WHERE id = $1", [storeId])).rows.length) {
      throw new HttpError(404, "Loja não encontrada", "not_found");
    }
    const to = this.now();
    const from = new Date(to.getTime() - hours * 3_600_000);
    const machines = (await this.db.query(
      "SELECT id, label, kind, device_id FROM machines WHERE store_id = $1 AND device_id IS NOT NULL ORDER BY code",
      [storeId],
    )).rows;
    const events = (await this.db.query(
      `SELECT e.device_id, e.status, e.at FROM device_presence_events e
       JOIN machines m ON m.device_id = e.device_id
       WHERE m.store_id = $1 AND e.at <= $2 ORDER BY e.at`,
      [storeId, to],
    )).rows.map((e) => ({ deviceId: e.device_id as string, status: e.status as PresenceState, at: new Date(e.at) }));
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      machines: machines.map((m) => {
        const mine = events.filter((e) => e.deviceId === m.device_id);
        const initial = mine.filter((e) => e.at <= from).at(-1)?.status ?? "offline";
        const segments = buildSegments(initial, mine, from, to);
        return {
          machineId: m.id,
          label: m.label,
          kind: m.kind,
          deviceId: m.device_id,
          onlineMs: durationOf(segments, "online"),
          offlineMs: durationOf(segments, "offline"),
          segments,
        };
      }),
    };
  }
}

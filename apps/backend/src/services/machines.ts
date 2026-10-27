import type { Db } from "../db.js";
import { HttpError } from "../errors.js";
import { randomDigitCode } from "./stores.js";

export type MachineRunStatus = "ONLINE" | "OFFLINE" | "IN_USE";

function iso(value: Date | string | null | undefined) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : String(value);
}

function deviceIp(raw: unknown) {
  if (!raw) return "";
  try {
    const info = typeof raw === "string" ? JSON.parse(raw) : raw;
    return typeof info?.ip === "string" ? info.ip : "";
  } catch {
    return "";
  }
}

export function runStatus(online: boolean, inUse: boolean): MachineRunStatus {
  if (!online) return "OFFLINE";
  if (inUse) return "IN_USE";
  return "ONLINE";
}

export function mapMachine(r: any, online = false, inUse = false, lastReleasedAt = "") {
  return {
    id: r.id,
    storeId: r.store_id,
    storeName: r.store_name ?? "",
    kind: r.kind,
    label: r.label,
    code: r.code ?? "",
    channel: r.channel,
    deviceId: r.device_id ?? "",
    priceOverrideCents: r.price_override_cents,
    active: r.active,
    blocked: !r.active,
    online,
    status: runStatus(online, inUse),
    ip: deviceIp(r.device_info),
    lastSeenAt: iso(r.last_seen_at),
    lastReleasedAt,
    lastBlockedAt: iso(r.blocked_at),
  };
}

export class MachineService {
  constructor(private db: Db) {}

  async list(storeId?: string) {
    const { rows } = storeId
      ? await this.db.query(
          `SELECT m.*, s.name AS store_name, d.last_seen_at, d.info AS device_info
           FROM machines m
           JOIN stores s ON s.id = m.store_id
           LEFT JOIN devices d ON d.device_id = m.device_id
           WHERE m.store_id = $1
           ORDER BY m.code, m.label`,
          [storeId],
        )
      : await this.db.query(
          `SELECT m.*, s.name AS store_name, d.last_seen_at, d.info AS device_info
           FROM machines m
           JOIN stores s ON s.id = m.store_id
           LEFT JOIN devices d ON d.device_id = m.device_id
           ORDER BY m.store_id, m.code, m.label`,
        );
    const last = await this.lastReleases();
    return { rows, last };
  }

  async get(id: string) {
    const { rows } = await this.db.query(
      `SELECT m.*, s.name AS store_name, d.last_seen_at, d.info AS device_info
       FROM machines m
       JOIN stores s ON s.id = m.store_id
       LEFT JOIN devices d ON d.device_id = m.device_id
       WHERE m.id = $1`,
      [id],
    );
    if (!rows[0]) throw new HttpError(404, "Máquina não encontrada", "not_found");
    const last = await this.lastReleases();
    return { row: rows[0], lastReleasedAt: last.get(rows[0].id) ?? last.get(rows[0].device_id) ?? "" };
  }

  async uniqueCode(preferred?: string) {
    if (preferred) {
      const taken = (await this.db.query("SELECT 1 FROM machines WHERE code = $1", [preferred])).rows[0];
      if (!taken) return preferred;
    }
    for (let i = 0; i < 30; i++) {
      const code = randomDigitCode(6);
      const taken = (await this.db.query("SELECT 1 FROM machines WHERE code = $1", [code])).rows[0];
      if (!taken) return code;
    }
    throw new HttpError(500, "Não foi possível gerar um código único", "code_exhausted");
  }

  async lastReleases() {
    const { rows } = await this.db.query(
      "SELECT machine_id, device_id, issued_at FROM release_commands ORDER BY issued_at DESC",
    );
    const map = new Map<string, string>();
    for (const r of rows) {
      const at = iso(r.issued_at);
      if (r.machine_id && !map.has(r.machine_id)) map.set(r.machine_id, at);
      if (r.device_id && !map.has(r.device_id)) map.set(r.device_id, at);
    }
    return map;
  }
}

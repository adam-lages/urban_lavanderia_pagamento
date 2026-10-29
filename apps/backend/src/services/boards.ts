import { MANUAL_CHANNEL, type DeviceInfoMessage } from "@lav/protocol";
import { randomUUID } from "node:crypto";
import type { Config } from "../config.js";
import type { Db } from "../db.js";
import { HttpError } from "../errors.js";
import type { DeviceGateway } from "../gateway.js";
import { logEvent, type ReleaseService } from "./releases.js";

export function mapBoard(r: any, online: boolean) {
  let info: DeviceInfoMessage | null = null;
  try {
    info = r.info ? (JSON.parse(r.info) as DeviceInfoMessage) : null;
  } catch {
    info = null;
  }
  return {
    deviceId: r.device_id,
    name: r.name ?? null,
    storeId: r.store_id ?? null,
    storeName: r.store_name ?? null,
    kind: r.kind ?? null,
    registered: !!(r.name && r.store_id && r.kind),
    online,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
    info,
  };
}

/** Placas ESP32: descoberta automática, cadastro e liberação manual. */
export class BoardService {
  constructor(
    private db: Db,
    private gateway: DeviceGateway,
    private releases: ReleaseService,
    private config: Pick<Config, "commandTtlSeconds">,
    private now: () => Date = () => new Date(),
  ) {}

  /** Registra a placa (se nova) e atualiza "visto por último". */
  async touch(deviceId: string, info?: DeviceInfoMessage): Promise<void> {
    const now = this.now();
    const infoJson = info ? JSON.stringify(info) : null;
    const upd = await this.db.query(
      "UPDATE devices SET last_seen_at = $2, info = COALESCE($3, info) WHERE device_id = $1 RETURNING device_id",
      [deviceId, now, infoJson],
    );
    if (upd.rows.length) return;
    try {
      await this.db.query(
        "INSERT INTO devices (device_id, first_seen_at, last_seen_at, info) VALUES ($1,$2,$2,$3)",
        [deviceId, now, infoJson],
      );
    } catch {
      /* corrida com outra mensagem da mesma placa: já existe */
    }
  }

  async list() {
    const { rows } = await this.db.query(
      "SELECT d.*, s.name AS store_name FROM devices d LEFT JOIN stores s ON s.id = d.store_id ORDER BY d.first_seen_at",
    );
    const boards = rows.map((r) => mapBoard(r, this.gateway.isOnline(r.device_id)));
    const cmds = await this.db.query(
      "SELECT * FROM release_commands WHERE source = 'MANUAL' ORDER BY created_at DESC",
    );
    return boards.map((b) => {
      const last = cmds.rows.find((c) => c.device_id === b.deviceId);
      return {
        ...b,
        lastCommand: last ? { id: last.id, status: last.status, issuedAt: last.issued_at, doneAt: last.done_at } : null,
      };
    });
  }

  async update(deviceId: string, patch: { name?: string; storeId?: string; kind?: "WASHER" | "DRYER" }) {
    const cur = (await this.db.query("SELECT * FROM devices WHERE device_id = $1", [deviceId])).rows[0];
    if (!cur) throw new HttpError(404, "Placa não encontrada", "not_found");
    if (patch.storeId) {
      const store = await this.db.query("SELECT id FROM stores WHERE id = $1", [patch.storeId]);
      if (!store.rows[0]) throw new HttpError(404, "Loja não encontrada", "not_found");
    }
    await this.db.query("UPDATE devices SET name = $2, store_id = $3, kind = $4 WHERE device_id = $1", [
      deviceId,
      patch.name ?? cur.name,
      patch.storeId ?? cur.store_id,
      patch.kind ?? cur.kind,
    ]);
    const row = (
      await this.db.query(
        "SELECT d.*, s.name AS store_name FROM devices d LEFT JOIN stores s ON s.id = d.store_id WHERE d.device_id = $1",
        [deviceId],
      )
    ).rows[0];
    return mapBoard(row, this.gateway.isOnline(deviceId));
  }

  /** Cria um comando manual (mesmo contrato MQTT) e o publica na hora. */
  async release(deviceId: string) {
    const dev = (await this.db.query("SELECT device_id FROM devices WHERE device_id = $1", [deviceId])).rows[0];
    if (!dev) throw new HttpError(404, "Placa não encontrada", "not_found");
    const machine = (await this.db.query("SELECT channel, active FROM machines WHERE device_id = $1 LIMIT 1", [deviceId])).rows[0];
    if (machine && machine.active === false) throw new HttpError(409, "Máquina bloqueada", "machine_blocked");
    if (!this.gateway.isOnline(deviceId)) throw new HttpError(409, "Placa offline", "device_offline");
    const id = randomUUID();
    const issued = this.now();
    const expires = new Date(issued.getTime() + this.config.commandTtlSeconds * 1000);
    const channel = machine?.channel ?? MANUAL_CHANNEL;
    await this.db.query(
      "INSERT INTO release_commands (id, order_item_id, device_id, channel, status, attempts, issued_at, expires_at, created_at, source) VALUES ($1,$2,$3,$4,'PENDING',0,$5,$6,$5,'MANUAL')",
      [id, `manual:${id}`, deviceId, channel, issued, expires],
    );
    await logEvent(this.db, id, "CREATED", "Liberação manual pelo dashboard");
    await this.releases.dispatch(id);
    return id;
  }
}

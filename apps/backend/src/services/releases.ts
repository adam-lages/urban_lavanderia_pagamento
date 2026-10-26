import { randomUUID } from "node:crypto";
import type { AckMessage } from "@lav/protocol";
import type { Db, Queryable } from "../db.js";
import type { DeviceGateway } from "../gateway.js";
import { HttpError } from "../errors.js";
import type { Config } from "../config.js";

export type CommandStatus = "PENDING" | "SENT" | "DONE" | "UNCONFIRMED" | "FAILED" | "EXPIRED";

export function mapCommand(r: any) {
  return {
    id: r.id,
    orderId: r.order_id,
    storeId: r.store_id,
    machineId: r.machine_id,
    deviceId: r.device_id,
    channel: r.channel,
    status: r.status as CommandStatus,
    attempts: r.attempts,
    issuedAt: r.issued_at,
    expiresAt: r.expires_at,
    sentAt: r.sent_at,
    doneAt: r.done_at,
    ...(r.machine_label !== undefined ? { machineLabel: r.machine_label, storeName: r.store_name } : {}),
  };
}

export async function logEvent(q: Queryable, commandId: string, type: string, detail?: string) {
  await q.query(
    "INSERT INTO release_events (id, command_id, type, detail, created_at) VALUES ($1,$2,$3,$4,$5)",
    [randomUUID(), commandId, type, detail ?? null, new Date()],
  );
}

export class ReleaseService {
  constructor(
    private db: Db,
    private gateway: DeviceGateway,
    private config: Pick<Config, "ackTimeoutSeconds" | "commandTtlSeconds">,
    private now: () => Date = () => new Date(),
  ) {}

  /** Publica um comando. Só o mesmo commandId é reenviado: a placa descarta repetidos. */
  async dispatch(commandId: string): Promise<void> {
    const { rows } = await this.db.query("SELECT * FROM release_commands WHERE id = $1", [commandId]);
    const cmd = rows[0];
    if (!cmd || !["PENDING", "SENT", "UNCONFIRMED", "EXPIRED", "FAILED"].includes(cmd.status)) return;
    if (new Date(cmd.expires_at) <= this.now()) {
      await this.markExpired(cmd.id);
      return;
    }
    if (!this.gateway.isOnline(cmd.device_id)) {
      await logEvent(this.db, cmd.id, "DEVICE_OFFLINE", "Placa offline; comando segue pendente");
      return;
    }
    try {
      await this.gateway.publishCommand(cmd.device_id, {
        commandId: cmd.id,
        channel: cmd.channel,
        issuedAt: new Date(cmd.issued_at).toISOString(),
        expiresAt: new Date(cmd.expires_at).toISOString(),
      });
    } catch (err) {
      await logEvent(this.db, cmd.id, "PUBLISH_ERROR", String((err as Error).message));
      return;
    }
    await this.db.query(
      "UPDATE release_commands SET status = 'SENT', sent_at = $2, attempts = attempts + 1 WHERE id = $1 AND status <> 'DONE'",
      [cmd.id, this.now()],
    );
    await logEvent(this.db, cmd.id, "SENT", `tentativa ${cmd.attempts + 1}`);
  }

  private async markExpired(id: string) {
    const r = await this.db.query(
      "UPDATE release_commands SET status = 'EXPIRED' WHERE id = $1 AND status IN ('PENDING','SENT','UNCONFIRMED') RETURNING id",
      [id],
    );
    if (r.rows.length) await logEvent(this.db, id, "EXPIRED", "Expirou sem confirmação da placa");
  }

  async handleAck(deviceId: string, ack: AckMessage): Promise<void> {
    const { rows } = await this.db.query("SELECT * FROM release_commands WHERE id = $1", [ack.commandId]);
    const cmd = rows[0];
    if (!cmd || cmd.device_id !== deviceId) return;
    if (ack.status === "done") {
      if (cmd.status === "DONE") return;
      await this.db.query("UPDATE release_commands SET status = 'DONE', done_at = $2 WHERE id = $1", [
        cmd.id,
        this.now(),
      ]);
      await logEvent(this.db, cmd.id, "DONE", cmd.status === "UNCONFIRMED" ? "confirmação tardia" : undefined);
    } else if (cmd.status !== "DONE") {
      await this.db.query("UPDATE release_commands SET status = 'FAILED' WHERE id = $1", [cmd.id]);
      await logEvent(this.db, cmd.id, "REJECTED", ack.reason);
    }
  }

  /** Reenvio manual (dashboard): mesmo commandId, nova validade. Nunca para comando já DONE. */
  async retry(commandId: string): Promise<void> {
    const { rows } = await this.db.query("SELECT * FROM release_commands WHERE id = $1", [commandId]);
    const cmd = rows[0];
    if (!cmd) throw new HttpError(404, "Comando não encontrado", "not_found");
    if (cmd.status === "DONE") throw new HttpError(409, "Comando já concluído", "already_done");
    const expiresAt = new Date(this.now().getTime() + this.config.commandTtlSeconds * 1000);
    await this.db.query("UPDATE release_commands SET expires_at = $2, status = 'PENDING' WHERE id = $1", [
      commandId,
      expiresAt,
    ]);
    await logEvent(this.db, commandId, "MANUAL_RETRY");
    await this.dispatch(commandId);
  }

  async dispatchPendingForDevice(deviceId: string): Promise<void> {
    const { rows } = await this.db.query(
      "SELECT id FROM release_commands WHERE device_id = $1 AND status = 'PENDING'",
      [deviceId],
    );
    for (const r of rows) await this.dispatch(r.id);
  }

  /**
   * Varredura periódica: PENDING é reentregue (mesmo id) até expirar; SENT sem ack
   * vira UNCONFIRMED e NÃO é reenviado sozinho (evita liberar duas vezes).
   */
  async sweep(): Promise<void> {
    const now = this.now();
    const ackDeadline = new Date(now.getTime() - this.config.ackTimeoutSeconds * 1000);
    const sent = await this.db.query("SELECT id, sent_at FROM release_commands WHERE status = 'SENT'");
    for (const r of sent.rows) {
      if (new Date(r.sent_at) <= ackDeadline) {
        await this.db.query("UPDATE release_commands SET status = 'UNCONFIRMED' WHERE id = $1 AND status = 'SENT'", [r.id]);
        await logEvent(this.db, r.id, "UNCONFIRMED", "Sem confirmação da placa; requer verificação manual");
      }
    }
    const pending = await this.db.query("SELECT id FROM release_commands WHERE status = 'PENDING'");
    for (const r of pending.rows) await this.dispatch(r.id);
  }
}

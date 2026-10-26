import { randomUUID } from "node:crypto";
import type { Db, Queryable } from "../db.js";
import { isUniqueViolation } from "../db.js";
import { HttpError } from "../errors.js";
import type { DeviceGateway } from "../gateway.js";
import type { Config } from "../config.js";
import type { PaymentProviderRegistry } from "../payments/provider.js";
import { logEvent, type ReleaseService } from "./releases.js";

export function mapOrder(o: any, items: any[] = [], payments: any[] = [], commands: any[] = []) {
  return {
    id: o.id,
    storeId: o.store_id,
    status: o.status,
    totalCents: o.total_cents,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    items: items.map((i) => ({ id: i.id, machineId: i.machine_id, kind: i.kind, priceCents: i.price_cents })),
    payments: payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      externalId: p.external_id,
      status: p.status,
      method: p.method,
      amountCents: p.amount_cents,
    })),
    commands: commands.map((c) => ({
      id: c.id,
      machineId: c.machine_id,
      channel: c.channel,
      status: c.status,
    })),
  };
}

export class OrderService {
  constructor(
    private db: Db,
    private gateway: DeviceGateway,
    private releases: ReleaseService,
    private providers: PaymentProviderRegistry,
    private config: Pick<Config, "requireDeviceOnline" | "commandTtlSeconds">,
    private now: () => Date = () => new Date(),
  ) {}

  async get(orderId: string) {
    const o = await this.db.query("SELECT * FROM orders WHERE id = $1", [orderId]);
    if (!o.rows[0]) throw new HttpError(404, "Pedido não encontrado", "not_found");
    return this.load(this.db, o.rows[0]);
  }

  private async load(q: Queryable, order: any) {
    const [items, payments, commands] = await Promise.all([
      q.query("SELECT * FROM order_items WHERE order_id = $1", [order.id]),
      q.query("SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at", [order.id]),
      q.query("SELECT * FROM release_commands WHERE order_id = $1", [order.id]),
    ]);
    return mapOrder(order, items.rows, payments.rows, commands.rows);
  }

  async create(input: { storeId: string; machineIds: string[]; idempotencyKey?: string }) {
    if (input.idempotencyKey) {
      const ex = await this.db.query("SELECT * FROM orders WHERE idempotency_key = $1", [input.idempotencyKey]);
      if (ex.rows[0]) return { order: await this.load(this.db, ex.rows[0]), created: false };
    }
    const ids = [...new Set(input.machineIds)];
    if (ids.length !== input.machineIds.length) throw new HttpError(400, "Máquina repetida no pedido", "duplicate_machine");

    const items: Array<{ machine: any; price: number }> = [];
    for (const id of ids) {
      const m = (await this.db.query("SELECT * FROM machines WHERE id = $1", [id])).rows[0];
      if (!m || m.store_id !== input.storeId || !m.active)
        throw new HttpError(422, `Máquina indisponível: ${id}`, "machine_unavailable");
      let price: number | null = m.price_override_cents;
      if (price === null || price === undefined) {
        const p = (
          await this.db.query("SELECT amount_cents FROM prices WHERE store_id = $1 AND kind = $2", [m.store_id, m.kind])
        ).rows[0];
        price = p?.amount_cents ?? null;
      }
      if (price === null) throw new HttpError(422, `Sem preço para ${m.label}`, "price_missing");
      if (this.config.requireDeviceOnline && !this.gateway.isOnline(m.device_id))
        throw new HttpError(409, `Placa offline: ${m.label}`, "device_offline");
      items.push({ machine: m, price });
    }
    const total = items.reduce((s, i) => s + i.price, 0);
    const orderId = randomUUID();
    try {
      await this.db.tx(async (q) => {
        await q.query(
          "INSERT INTO orders (id, store_id, status, total_cents, idempotency_key, created_at) VALUES ($1,$2,'PENDING',$3,$4,$5)",
          [orderId, input.storeId, total, input.idempotencyKey ?? null, this.now()],
        );
        for (const i of items)
          await q.query(
            "INSERT INTO order_items (id, order_id, machine_id, kind, price_cents) VALUES ($1,$2,$3,$4,$5)",
            [randomUUID(), orderId, i.machine.id, i.machine.kind, i.price],
          );
      });
    } catch (err) {
      if (input.idempotencyKey && isUniqueViolation(err)) {
        const ex = await this.db.query("SELECT * FROM orders WHERE idempotency_key = $1", [input.idempotencyKey]);
        if (ex.rows[0]) return { order: await this.load(this.db, ex.rows[0]), created: false };
      }
      throw err;
    }
    return { order: await this.get(orderId), created: true };
  }

  /**
   * Registra o resultado do pagamento. Idempotente por (provider, externalId):
   * reenviar o mesmo resultado devolve o estado atual sem duplicar liberações.
   */
  async recordPayment(orderId: string, providerName: string, payload: unknown) {
    const provider = this.providers.get(providerName);
    const orderRow = (await this.db.query("SELECT * FROM orders WHERE id = $1", [orderId])).rows[0];
    if (!orderRow) throw new HttpError(404, "Pedido não encontrado", "not_found");

    const result = provider.parse(payload, { id: orderId, totalCents: orderRow.total_cents });

    const existing = (
      await this.db.query("SELECT * FROM payments WHERE provider = $1 AND external_id = $2", [
        provider.name,
        result.externalId,
      ])
    ).rows[0];
    if (existing) {
      if (existing.order_id !== orderId) throw new HttpError(409, "Pagamento já usado em outro pedido", "payment_reused");
      return { order: await this.get(orderId), duplicate: true };
    }

    if (result.amountCents !== orderRow.total_cents)
      throw new HttpError(422, "Valor do pagamento difere do pedido", "amount_mismatch");
    if (orderRow.status !== "PENDING") throw new HttpError(409, `Pedido ${orderRow.status}`, "order_not_pending");

    const commandIds: string[] = [];
    try {
      await this.db.tx(async (q) => {
        await q.query(
          "INSERT INTO payments (id, order_id, provider, external_id, status, method, amount_cents, raw, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            randomUUID(),
            orderId,
            provider.name,
            result.externalId,
            result.status,
            result.method ?? null,
            result.amountCents,
            JSON.stringify(result.raw ?? null),
            this.now(),
          ],
        );
        if (result.status !== "APPROVED") return;
        const marked = await q.query(
          "UPDATE orders SET status = 'PAID', paid_at = $2 WHERE id = $1 AND status = 'PENDING' RETURNING id",
          [orderId, this.now()],
        );
        if (!marked.rows.length) throw new HttpError(409, "Pedido já pago", "order_not_pending");
        const items = (
          await q.query(
            "SELECT i.id, i.machine_id, m.device_id, m.channel FROM order_items i JOIN machines m ON m.id = i.machine_id WHERE i.order_id = $1",
            [orderId],
          )
        ).rows;
        const issued = this.now();
        const expires = new Date(issued.getTime() + this.config.commandTtlSeconds * 1000);
        for (const it of items) {
          const id = randomUUID();
          await q.query(
            "INSERT INTO release_commands (id, order_item_id, order_id, store_id, machine_id, device_id, channel, status, attempts, issued_at, expires_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',0,$8,$9,$8)",
            [id, it.id, orderId, orderRow.store_id, it.machine_id, it.device_id, it.channel, issued, expires],
          );
          await logEvent(q, id, "CREATED");
          commandIds.push(id);
        }
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        const again = (
          await this.db.query("SELECT order_id FROM payments WHERE provider = $1 AND external_id = $2", [
            provider.name,
            result.externalId,
          ])
        ).rows[0];
        if (again?.order_id === orderId) return { order: await this.get(orderId), duplicate: true };
        throw new HttpError(409, "Conflito ao registrar pagamento", "conflict");
      }
      throw err;
    }
    for (const id of commandIds) await this.releases.dispatch(id);
    return { order: await this.get(orderId), duplicate: false };
  }
}

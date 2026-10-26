import { randomUUID } from "node:crypto";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { ZodError, z } from "zod";
import { MAX_CHANNEL, MIN_CHANNEL } from "@lav/protocol";
import type { Config } from "./config.js";
import { isUniqueViolation, type Db } from "./db.js";
import { HttpError } from "./errors.js";
import type { DeviceGateway } from "./gateway.js";
import { PaymentProviderRegistry } from "./payments/provider.js";
import { SimulatedProvider } from "./payments/simulated.js";
import { StoneDeeplinkProvider } from "./payments/stone-deeplink.js";
import { BoardService } from "./services/boards.js";
import { OrderService } from "./services/orders.js";
import { ReleaseService, mapCommand } from "./services/releases.js";

declare module "fastify" {
  interface FastifyInstance {
    releases: ReleaseService;
  }
}

export interface AppDeps {
  db: Db;
  gateway: DeviceGateway;
  config: Config;
  now?: () => Date;
}

const kind = z.enum(["WASHER", "DRYER"]);
const channel = z.number().int().min(MIN_CHANNEL).max(MAX_CHANNEL);

const mapStore = (r: any) => ({ id: r.id, name: r.name, code: r.code, active: r.active });
const mapMachine = (r: any, online?: boolean) => ({
  id: r.id,
  storeId: r.store_id,
  kind: r.kind,
  label: r.label,
  channel: r.channel,
  deviceId: r.device_id,
  priceOverrideCents: r.price_override_cents,
  active: r.active,
  ...(online === undefined ? {} : { online }),
});
const mapPrice = (r: any) => ({ id: r.id, storeId: r.store_id, kind: r.kind, amountCents: r.amount_cents });

export async function buildApp({ db, gateway, config, now }: AppDeps) {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  const providers = new PaymentProviderRegistry().register(new StoneDeeplinkProvider());
  if (config.enableSimulatedPayments) providers.register(new SimulatedProvider());

  const releases = new ReleaseService(db, gateway, config, now);
  const orders = new OrderService(db, gateway, releases, providers, config, now);

  const boards = new BoardService(db, gateway, releases, config, now);

  gateway.onAck((deviceId, ack) => {
    void boards.touch(deviceId).catch(() => undefined);
    void releases.handleAck(deviceId, ack).catch(() => undefined);
  });
  gateway.onInfo((deviceId, info) => void boards.touch(deviceId, info).catch(() => undefined));
  gateway.onPresence((deviceId, status) => {
    void boards.touch(deviceId).catch(() => undefined);
    if (status === "online") void releases.dispatchPendingForDevice(deviceId).catch(() => undefined);
  });

  app.setErrorHandler((err: any, _req, reply) => {
    if (err instanceof HttpError) return reply.status(err.status).send({ error: err.code, message: err.message });
    if (err instanceof ZodError) return reply.status(400).send({ error: "validation", issues: err.issues });
    if (isUniqueViolation(err)) return reply.status(409).send({ error: "conflict", message: "Registro duplicado" });
    if (err.statusCode && err.statusCode < 500) return reply.status(err.statusCode).send({ error: "bad_request", message: err.message });
    app.log.error(err);
    return reply.status(500).send({ error: "internal" });
  });

  const bearer = (req: FastifyRequest) => (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const requireAdmin = async (req: FastifyRequest, _reply: FastifyReply) => {
    if (bearer(req) !== config.adminToken) throw new HttpError(401, "Não autorizado", "unauthorized");
  };
  const requirePos = async (req: FastifyRequest, _reply: FastifyReply) => {
    const t = bearer(req);
    if (t !== config.posToken && t !== config.adminToken) throw new HttpError(401, "Não autorizado", "unauthorized");
  };

  app.get("/health", async () => ({ ok: true }));

  /* ---------- Admin: lojas, máquinas, preços ---------- */
  app.get("/stores", { preHandler: requireAdmin }, async () => {
    const { rows } = await db.query("SELECT * FROM stores ORDER BY name");
    return rows.map(mapStore);
  });
  app.post("/stores", { preHandler: requireAdmin }, async (req, reply) => {
    const b = z.object({ name: z.string().min(1), code: z.string().min(1) }).parse(req.body);
    const id = randomUUID();
    await db.query("INSERT INTO stores (id, name, code, created_at) VALUES ($1,$2,$3,$4)", [id, b.name, b.code, new Date()]);
    const { rows } = await db.query("SELECT * FROM stores WHERE id = $1", [id]);
    return reply.status(201).send(mapStore(rows[0]));
  });
  app.patch("/stores/:id", { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const b = z.object({ name: z.string().min(1).optional(), active: z.boolean().optional() }).parse(req.body);
    const { rows } = await db.query(
      "UPDATE stores SET name = COALESCE($2, name), active = COALESCE($3, active) WHERE id = $1 RETURNING *",
      [id, b.name ?? null, b.active ?? null],
    );
    if (!rows[0]) throw new HttpError(404, "Loja não encontrada", "not_found");
    return mapStore(rows[0]);
  });

  app.get("/machines", { preHandler: requireAdmin }, async (req) => {
    const { storeId } = z.object({ storeId: z.string().optional() }).parse(req.query);
    const { rows } = storeId
      ? await db.query("SELECT * FROM machines WHERE store_id = $1 ORDER BY label", [storeId])
      : await db.query("SELECT * FROM machines ORDER BY store_id, label");
    return rows.map((r) => mapMachine(r, gateway.isOnline(r.device_id)));
  });
  app.post("/machines", { preHandler: requireAdmin }, async (req, reply) => {
    const b = z
      .object({
        storeId: z.string(),
        kind,
        label: z.string().min(1),
        channel,
        deviceId: z.string().min(1),
        priceOverrideCents: z.number().int().min(0).nullable().optional(),
      })
      .parse(req.body);
    const store = await db.query("SELECT id FROM stores WHERE id = $1", [b.storeId]);
    if (!store.rows[0]) throw new HttpError(404, "Loja não encontrada", "not_found");
    const id = randomUUID();
    await db.query(
      "INSERT INTO machines (id, store_id, kind, label, channel, device_id, price_override_cents, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, b.storeId, b.kind, b.label, b.channel, b.deviceId, b.priceOverrideCents ?? null, new Date()],
    );
    const { rows } = await db.query("SELECT * FROM machines WHERE id = $1", [id]);
    return reply.status(201).send(mapMachine(rows[0]));
  });
  app.patch("/machines/:id", { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const b = z
      .object({
        label: z.string().min(1).optional(),
        channel: channel.optional(),
        deviceId: z.string().min(1).optional(),
        active: z.boolean().optional(),
        priceOverrideCents: z.number().int().min(0).nullable().optional(),
      })
      .parse(req.body);
    const cur = (await db.query("SELECT * FROM machines WHERE id = $1", [id])).rows[0];
    if (!cur) throw new HttpError(404, "Máquina não encontrada", "not_found");
    const override = b.priceOverrideCents === undefined ? cur.price_override_cents : b.priceOverrideCents;
    const { rows } = await db.query(
      "UPDATE machines SET label=$2, channel=$3, device_id=$4, active=$5, price_override_cents=$6 WHERE id=$1 RETURNING *",
      [id, b.label ?? cur.label, b.channel ?? cur.channel, b.deviceId ?? cur.device_id, b.active ?? cur.active, override],
    );
    return mapMachine(rows[0]);
  });

  app.get("/prices", { preHandler: requireAdmin }, async (req) => {
    const { storeId } = z.object({ storeId: z.string().optional() }).parse(req.query);
    const { rows } = storeId
      ? await db.query("SELECT * FROM prices WHERE store_id = $1 ORDER BY kind", [storeId])
      : await db.query("SELECT * FROM prices ORDER BY store_id, kind");
    return rows.map(mapPrice);
  });
  app.put("/prices", { preHandler: requireAdmin }, async (req) => {
    const b = z.object({ storeId: z.string(), kind, amountCents: z.number().int().min(0) }).parse(req.body);
    const store = await db.query("SELECT id FROM stores WHERE id = $1", [b.storeId]);
    if (!store.rows[0]) throw new HttpError(404, "Loja não encontrada", "not_found");
    const cur = (await db.query("SELECT id FROM prices WHERE store_id = $1 AND kind = $2", [b.storeId, b.kind])).rows[0];
    if (cur) await db.query("UPDATE prices SET amount_cents = $2, updated_at = $3 WHERE id = $1", [cur.id, b.amountCents, new Date()]);
    else
      await db.query("INSERT INTO prices (id, store_id, kind, amount_cents, updated_at) VALUES ($1,$2,$3,$4,$5)", [
        randomUUID(), b.storeId, b.kind, b.amountCents, new Date(),
      ]);
    const { rows } = await db.query("SELECT * FROM prices WHERE store_id = $1 AND kind = $2", [b.storeId, b.kind]);
    return mapPrice(rows[0]);
  });

  /* ---------- Admin: relatórios e liberações ---------- */
  app.get("/reports/sales", { preHandler: requireAdmin }, async (req) => {
    const q = z
      .object({ from: z.string().optional(), to: z.string().optional(), storeId: z.string().optional() })
      .parse(req.query);
    const from = q.from ? new Date(q.from) : new Date('2000-01-01T00:00:00Z');
    const to = q.to ? new Date(q.to) : new Date('2999-01-01T00:00:00Z');
    if (isNaN(from.getTime()) || isNaN(to.getTime())) throw new HttpError(400, "Período inválido", "invalid_period");
    const params: unknown[] = [from, to];
    let sql = "SELECT id, store_id, total_cents, paid_at FROM orders WHERE status = 'PAID' AND paid_at >= $1 AND paid_at < $2";
    if (q.storeId) {
      params.push(q.storeId);
      sql += " AND store_id = $3";
    }
    const paid = (await db.query(sql, params)).rows;
    const items = (await db.query("SELECT order_id, kind, price_cents FROM order_items")).rows;
    const byOrder = new Map<string, any[]>();
    for (const it of items) (byOrder.get(it.order_id) ?? byOrder.set(it.order_id, []).get(it.order_id)!).push(it);

    const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" });
    const days = new Map<string, { date: string; orders: number; revenueCents: number }>();
    const stores = new Map<string, { storeId: string; orders: number; revenueCents: number }>();
    const kinds: Record<string, { count: number; revenueCents: number }> = {
      WASHER: { count: 0, revenueCents: 0 },
      DRYER: { count: 0, revenueCents: 0 },
    };
    let revenue = 0;
    for (const o of paid) {
      revenue += o.total_cents;
      const d = day.format(new Date(o.paid_at));
      const dd = days.get(d) ?? { date: d, orders: 0, revenueCents: 0 };
      dd.orders++; dd.revenueCents += o.total_cents; days.set(d, dd);
      const ss = stores.get(o.store_id) ?? { storeId: o.store_id, orders: 0, revenueCents: 0 };
      ss.orders++; ss.revenueCents += o.total_cents; stores.set(o.store_id, ss);
      for (const it of byOrder.get(o.id) ?? []) {
        kinds[it.kind]!.count++;
        kinds[it.kind]!.revenueCents += it.price_cents;
      }
    }
    return {
      from: q.from ?? null,
      to: q.to ?? null,
      totals: { orders: paid.length, revenueCents: revenue },
      byDay: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
      byStore: [...stores.values()],
      byKind: kinds,
    };
  });

  app.get("/orders", { preHandler: requireAdmin }, async (req) => {
    const q = z.object({ storeId: z.string().optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }).parse(req.query);
    const { rows } = q.storeId
      ? await db.query("SELECT * FROM orders WHERE store_id = $1 ORDER BY created_at DESC LIMIT $2", [q.storeId, q.limit])
      : await db.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT $1", [q.limit]);
    return rows.map((o) => ({ id: o.id, storeId: o.store_id, status: o.status, totalCents: o.total_cents, createdAt: o.created_at, paidAt: o.paid_at }));
  });

  app.get("/commands", { preHandler: requireAdmin }, async (req) => {
    const q = z
      .object({ status: z.string().optional(), storeId: z.string().optional(), limit: z.coerce.number().int().min(1).max(500).default(100) })
      .parse(req.query);
    const { rows } = await db.query(
      "SELECT c.*, m.label AS machine_label, s.name AS store_name FROM release_commands c LEFT JOIN machines m ON m.id = c.machine_id LEFT JOIN stores s ON s.id = c.store_id ORDER BY c.created_at DESC",
    );
    return rows
      .filter((r) => (!q.status || r.status === q.status) && (!q.storeId || r.store_id === q.storeId))
      .slice(0, q.limit)
      .map(mapCommand);
  });
  app.get("/commands/:id", { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const c = (await db.query("SELECT * FROM release_commands WHERE id = $1", [id])).rows[0];
    if (!c) throw new HttpError(404, "Comando não encontrado", "not_found");
    const ev = (await db.query("SELECT * FROM release_events WHERE command_id = $1 ORDER BY created_at", [id])).rows;
    return { ...mapCommand(c), events: ev.map((e) => ({ type: e.type, detail: e.detail, createdAt: e.created_at })) };
  });
  app.post("/commands/:id/retry", { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    await releases.retry(id);
    const c = (await db.query("SELECT * FROM release_commands WHERE id = $1", [id])).rows[0];
    return mapCommand(c);
  });
  /* ---------- Admin: placas ESP32 (menu "Máquinas") ---------- */
  app.get("/boards", { preHandler: requireAdmin }, async () => boards.list());
  app.patch("/boards/:deviceId", { preHandler: requireAdmin }, async (req) => {
    const { deviceId } = req.params as { deviceId: string };
    const b = z.object({ name: z.string().trim().min(1).max(80).optional(), storeId: z.string().optional(), kind: kind.optional() }).parse(req.body);
    return boards.update(deviceId, b);
  });
  app.post("/boards/:deviceId/release", { preHandler: requireAdmin }, async (req, reply) => {
    const { deviceId } = req.params as { deviceId: string };
    const id = await boards.release(deviceId);
    const c = (await db.query("SELECT * FROM release_commands WHERE id = $1", [id])).rows[0];
    return reply.status(202).send(mapCommand(c));
  });
  app.get("/devices", { preHandler: requireAdmin }, async () => {
    const { rows } = await db.query("SELECT DISTINCT device_id FROM machines");
    return rows.map((r) => ({ deviceId: r.device_id, online: gateway.isOnline(r.device_id) }));
  });

  /* ---------- POS (app da P2) ---------- */
  app.get("/pos/stores/:id/config", { preHandler: requirePos }, async (req) => {
    const { id } = req.params as { id: string };
    const store = (await db.query("SELECT * FROM stores WHERE id = $1 AND active = true", [id])).rows[0];
    if (!store) throw new HttpError(404, "Loja não encontrada", "not_found");
    const machines = (await db.query("SELECT * FROM machines WHERE store_id = $1 AND active = true ORDER BY label", [id])).rows;
    const prices = (await db.query("SELECT * FROM prices WHERE store_id = $1", [id])).rows;
    const priceOf = (m: any) => m.price_override_cents ?? prices.find((p) => p.kind === m.kind)?.amount_cents ?? null;
    return {
      store: mapStore(store),
      paymentProviders: providers.names(),
      machines: machines.map((m) => ({
        id: m.id, kind: m.kind, label: m.label, priceCents: priceOf(m), online: gateway.isOnline(m.device_id),
      })),
    };
  });

  app.post("/orders", { preHandler: requirePos }, async (req, reply) => {
    const b = z.object({ storeId: z.string(), machineIds: z.array(z.string()).min(1).max(20) }).parse(req.body);
    const key = req.headers["idempotency-key"];
    const { order, created } = await orders.create({
      storeId: b.storeId,
      machineIds: b.machineIds,
      idempotencyKey: typeof key === "string" && key ? key : undefined,
    });
    return reply.status(created ? 201 : 200).send(order);
  });
  app.get("/orders/:id", { preHandler: requirePos }, async (req) => orders.get((req.params as { id: string }).id));
  app.post("/orders/:id/payments", { preHandler: requirePos }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = z.object({ provider: z.string(), payload: z.unknown() }).parse(req.body);
    const { order, duplicate } = await orders.recordPayment(id, b.provider, b.payload);
    return reply.status(duplicate ? 200 : 201).send(order);
  });

  const sweepTimer = setInterval(() => void releases.sweep().catch(() => undefined), 5000);
  sweepTimer.unref();
  app.addHook("onClose", async () => clearInterval(sweepTimer));

  app.decorate("releases", releases);
  return app;
}

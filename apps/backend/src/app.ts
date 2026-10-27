import { randomUUID } from "node:crypto";
import http from "node:http";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
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
import { CustomerService } from "./services/customers.js";
import { MachineService, mapMachine } from "./services/machines.js";
import { OverviewService } from "./services/overview.js";
import { SalesService } from "./services/sales.js";
import { MACHINE_CODE, STORE_CODE, StoreService } from "./services/stores.js";

export interface AppDeps {
  db: Db;
  gateway: DeviceGateway;
  config: Config;
  now?: () => Date;
}

export interface InjectOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  payload?: unknown;
}

export interface InjectResponse {
  statusCode: number;
  json: () => any;
}

export interface LavHttp {
  inject: (opts: InjectOptions) => Promise<InjectResponse>;
  listen: (opts: { port: number; host?: string }) => Promise<http.Server>;
  close: () => Promise<void>;
  releases: ReleaseService;
}

const kind = z.enum(["WASHER", "DRYER"]);
const channel = z.number().int().min(MIN_CHANNEL).max(MAX_CHANNEL);

const mapStore = (r: any) => ({ id: r.id, name: r.name, code: r.code, address: r.address ?? "", active: r.active });
const mapPrice = (r: any) => ({ id: r.id, storeId: r.store_id, kind: r.kind, amountCents: r.amount_cents });

function run(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export async function buildApp({ db, gateway, config, now }: AppDeps): Promise<LavHttp> {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "1mb" }));

  const providers = new PaymentProviderRegistry().register(new StoneDeeplinkProvider());
  if (config.enableSimulatedPayments) providers.register(new SimulatedProvider());

  const releases = new ReleaseService(db, gateway, config, now);
  const orders = new OrderService(db, gateway, releases, providers, config, now);
  const boards = new BoardService(db, gateway, releases, config, now);
  const stores = new StoreService(db);
  const customers = new CustomerService(db, now);
  const sales = new SalesService(db);
  const overview = new OverviewService(db, now);
  const machines = new MachineService(db);

  gateway.onAck((deviceId, ack) => {
    void boards.touch(deviceId).catch(() => undefined);
    void releases.handleAck(deviceId, ack).catch(() => undefined);
  });
  gateway.onInfo((deviceId, info) => void boards.touch(deviceId, info).catch(() => undefined));
  gateway.onPresence((deviceId, status) => {
    void boards.touch(deviceId).catch(() => undefined);
    if (status === "online") void releases.dispatchPendingForDevice(deviceId).catch(() => undefined);
  });

  const bearer = (req: Request) => (req.headers.authorization ?? "").toString().replace(/^Bearer\s+/i, "");
  const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
    if (bearer(req) !== config.adminToken) return next(new HttpError(401, "Não autorizado", "unauthorized"));
    next();
  };
  const requirePos = (req: Request, _res: Response, next: NextFunction) => {
    const t = bearer(req);
    if (t !== config.posToken && t !== config.adminToken) return next(new HttpError(401, "Não autorizado", "unauthorized"));
    next();
  };

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  const storeBody = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    code: z.string().regex(STORE_CODE).optional(),
    address: z.string().max(240).optional(),
    active: z.boolean().optional(),
  });
  app.get("/stores", requireAdmin, run(async (_req, res) => {
    res.json(await stores.list());
  }));
  app.get("/stores/next-code", requireAdmin, run(async (_req, res) => {
    res.json({ code: await stores.uniqueCode() });
  }));
  app.post("/stores", requireAdmin, run(async (req, res) => {
    const b = storeBody.extend({ name: z.string().trim().min(1).max(80) }).parse(req.body);
    res.status(201).json(await stores.create(b));
  }));
  app.get("/stores/:id", requireAdmin, run(async (req, res) => {
    res.json(await stores.get(req.params.id));
  }));
  app.patch("/stores/:id", requireAdmin, run(async (req, res) => {
    if (Object.prototype.hasOwnProperty.call(req.body, "code")) {
      throw new HttpError(400, "O código da lavanderia não pode ser alterado", "code_immutable");
    }
    const { code: _code, ...patch } = storeBody.parse(req.body);
    res.json(await stores.update(req.params.id, patch));
  }));
  app.delete("/stores/:id", requireAdmin, run(async (req, res) => {
    await stores.remove(req.params.id);
    res.status(204).send();
  }));

  app.get("/customers", requireAdmin, run(async (req, res) => {
    const q = z.object({
      name: z.string().optional(),
      cpf: z.string().optional(),
      storeId: z.string().optional(),
      page: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }).parse(req.query);
    res.json(await customers.list(q));
  }));
  app.get("/customers/:id", requireAdmin, run(async (req, res) => {
    res.json(await customers.get(req.params.id));
  }));
  app.patch("/customers/:id", requireAdmin, run(async (req, res) => {
    const b = z.object({ blocked: z.boolean() }).parse(req.body);
    res.json(await customers.setBlocked(req.params.id, b.blocked));
  }));

  app.get("/dashboard/overview", requireAdmin, run(async (req, res) => {
    const q = z.object({ storeId: z.string().optional(), from: z.string(), to: z.string() }).parse(req.query);
    res.json(await overview.get(q));
  }));

  app.get("/sales", requireAdmin, run(async (req, res) => {
    const q = z.object({
      storeId: z.string().optional(),
      customerName: z.string().optional(),
      customerId: z.string().optional(),
      page: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }).parse(req.query);
    res.json(await sales.list(q));
  }));

  async function busyDevices() {
    const { rows } = await db.query("SELECT DISTINCT device_id FROM release_commands WHERE status IN ('PENDING','SENT')");
    return new Set(rows.map((r) => r.device_id));
  }
  function normalizeDeviceId(value?: string | null) {
    const t = (value ?? "").trim();
    return t || null;
  }
  async function assertDeviceFree(deviceId: string, exceptId?: string) {
    const { rows } = await db.query("SELECT id, label FROM machines WHERE device_id = $1", [deviceId]);
    const taken = rows.find((r) => r.id !== exceptId);
    if (taken) throw new HttpError(409, `Esta placa ESP32 já está na máquina "${taken.label}".`, "device_taken");
  }
  async function present(r: any, last: Map<string, string>, busy?: Set<string>) {
    const busySet = busy ?? await busyDevices();
    const online = gateway.isOnline(r.device_id);
    const released = last.get(r.id) ?? last.get(r.device_id) ?? "";
    return mapMachine(r, online, online && busySet.has(r.device_id), released);
  }

  app.get("/machines", requireAdmin, run(async (req, res) => {
    const { storeId } = z.object({ storeId: z.string().optional() }).parse(req.query);
    const { rows, last } = await machines.list(storeId);
    const busy = await busyDevices();
    res.json(await Promise.all(rows.map((r) => present(r, last, busy))));
  }));
  app.get("/machines/next-code", requireAdmin, run(async (_req, res) => {
    res.json({ code: await machines.uniqueCode() });
  }));
  app.get("/machines/:id", requireAdmin, run(async (req, res) => {
    const { row, lastReleasedAt } = await machines.get(req.params.id);
    const last = new Map<string, string>([[row.id, lastReleasedAt]]);
    res.json(await present(row, last));
  }));
  app.post("/machines", requireAdmin, run(async (req, res) => {
    const b = z
      .object({
        storeId: z.string(),
        kind,
        label: z.string().min(1),
        code: z.string().regex(MACHINE_CODE).optional(),
        channel,
        deviceId: z.string().optional(),
        priceOverrideCents: z.number().int().min(0).nullable().optional(),
      })
      .parse(req.body);
    const store = await db.query("SELECT id FROM stores WHERE id = $1", [b.storeId]);
    if (!store.rows[0]) throw new HttpError(404, "Loja não encontrada", "not_found");
    const deviceId = normalizeDeviceId(b.deviceId);
    if (deviceId) await assertDeviceFree(deviceId);
    const id = randomUUID();
    const code = await machines.uniqueCode(b.code);
    await db.query(
      "INSERT INTO machines (id, store_id, kind, label, channel, device_id, price_override_cents, code, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [id, b.storeId, b.kind, b.label, b.channel, deviceId, b.priceOverrideCents ?? null, code, new Date()],
    );
    const got = await machines.get(id);
    res.status(201).json(await present(got.row, new Map([[id, got.lastReleasedAt]])));
  }));
  app.patch("/machines/:id", requireAdmin, run(async (req, res) => {
    const { id } = req.params;
    const b = z
      .object({
        label: z.string().min(1).optional(),
        kind: kind.optional(),
        channel: channel.optional(),
        deviceId: z.string().optional(),
        active: z.boolean().optional(),
        blocked: z.boolean().optional(),
        priceOverrideCents: z.number().int().min(0).nullable().optional(),
      })
      .parse(req.body);
    if (Object.prototype.hasOwnProperty.call(req.body, "code")) {
      throw new HttpError(400, "O código da máquina não pode ser alterado", "code_immutable");
    }
    const cur = (await db.query("SELECT * FROM machines WHERE id = $1", [id])).rows[0];
    if (!cur) throw new HttpError(404, "Máquina não encontrada", "not_found");
    const deviceId = b.deviceId === undefined ? cur.device_id : normalizeDeviceId(b.deviceId);
    if (deviceId) await assertDeviceFree(deviceId, id);
    const override = b.priceOverrideCents === undefined ? cur.price_override_cents : b.priceOverrideCents;
    const active = b.blocked !== undefined ? !b.blocked : (b.active ?? cur.active);
    const becomingBlocked = active === false && cur.active === true;
    const blockedAt = becomingBlocked ? new Date() : cur.blocked_at;
    await db.query(
      "UPDATE machines SET label=$2, kind=$3, channel=$4, device_id=$5, active=$6, price_override_cents=$7, blocked_at=$8 WHERE id=$1",
      [id, b.label ?? cur.label, b.kind ?? cur.kind, b.channel ?? cur.channel, deviceId, active, override, blockedAt],
    );
    const got = await machines.get(id);
    res.json(await present(got.row, new Map([[id, got.lastReleasedAt]])));
  }));

  app.get("/prices", requireAdmin, run(async (req, res) => {
    const { storeId } = z.object({ storeId: z.string().optional() }).parse(req.query);
    const { rows } = storeId
      ? await db.query("SELECT * FROM prices WHERE store_id = $1 ORDER BY kind", [storeId])
      : await db.query("SELECT * FROM prices ORDER BY store_id, kind");
    res.json(rows.map(mapPrice));
  }));
  app.put("/prices", requireAdmin, run(async (req, res) => {
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
    res.json(mapPrice(rows[0]));
  }));

  app.get("/reports/sales", requireAdmin, run(async (req, res) => {
    const q = z
      .object({ from: z.string().optional(), to: z.string().optional(), storeId: z.string().optional() })
      .parse(req.query);
    const from = q.from ? new Date(q.from) : new Date("2000-01-01T00:00:00Z");
    const to = q.to ? new Date(q.to) : new Date("2999-01-01T00:00:00Z");
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
      dd.orders++;
      dd.revenueCents += o.total_cents;
      days.set(d, dd);
      const ss = stores.get(o.store_id) ?? { storeId: o.store_id, orders: 0, revenueCents: 0 };
      ss.orders++;
      ss.revenueCents += o.total_cents;
      stores.set(o.store_id, ss);
      for (const it of byOrder.get(o.id) ?? []) {
        kinds[it.kind]!.count++;
        kinds[it.kind]!.revenueCents += it.price_cents;
      }
    }
    res.json({
      from: q.from ?? null,
      to: q.to ?? null,
      totals: { orders: paid.length, revenueCents: revenue },
      byDay: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
      byStore: [...stores.values()],
      byKind: kinds,
    });
  }));

  app.get("/orders", requireAdmin, run(async (req, res) => {
    const q = z.object({ storeId: z.string().optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }).parse(req.query);
    const { rows } = q.storeId
      ? await db.query("SELECT * FROM orders WHERE store_id = $1 ORDER BY created_at DESC LIMIT $2", [q.storeId, q.limit])
      : await db.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT $1", [q.limit]);
    res.json(rows.map((o) => ({ id: o.id, storeId: o.store_id, status: o.status, totalCents: o.total_cents, createdAt: o.created_at, paidAt: o.paid_at })));
  }));

  app.get("/commands", requireAdmin, run(async (req, res) => {
    const q = z
      .object({ status: z.string().optional(), storeId: z.string().optional(), limit: z.coerce.number().int().min(1).max(500).default(100) })
      .parse(req.query);
    const { rows } = await db.query(
      "SELECT c.*, m.label AS machine_label, s.name AS store_name FROM release_commands c LEFT JOIN machines m ON m.id = c.machine_id LEFT JOIN stores s ON s.id = c.store_id ORDER BY c.created_at DESC",
    );
    res.json(
      rows
        .filter((r) => (!q.status || r.status === q.status) && (!q.storeId || r.store_id === q.storeId))
        .slice(0, q.limit)
        .map(mapCommand),
    );
  }));
  app.get("/commands/:id", requireAdmin, run(async (req, res) => {
    const { id } = req.params;
    const c = (await db.query("SELECT * FROM release_commands WHERE id = $1", [id])).rows[0];
    if (!c) throw new HttpError(404, "Comando não encontrado", "not_found");
    const ev = (await db.query("SELECT * FROM release_events WHERE command_id = $1 ORDER BY created_at", [id])).rows;
    res.json({ ...mapCommand(c), events: ev.map((e) => ({ type: e.type, detail: e.detail, createdAt: e.created_at })) });
  }));
  app.post("/commands/:id/retry", requireAdmin, run(async (req, res) => {
    const { id } = req.params;
    await releases.retry(id);
    const c = (await db.query("SELECT * FROM release_commands WHERE id = $1", [id])).rows[0];
    res.json(mapCommand(c));
  }));

  app.get("/boards", requireAdmin, run(async (_req, res) => {
    res.json(await boards.list());
  }));
  app.patch("/boards/:deviceId", requireAdmin, run(async (req, res) => {
    const { deviceId } = req.params;
    const b = z.object({ name: z.string().trim().min(1).max(80).optional(), storeId: z.string().optional(), kind: kind.optional() }).parse(req.body);
    res.json(await boards.update(deviceId, b));
  }));
  app.post("/boards/:deviceId/release", requireAdmin, run(async (req, res) => {
    const { deviceId } = req.params;
    const id = await boards.release(deviceId);
    const c = (await db.query("SELECT * FROM release_commands WHERE id = $1", [id])).rows[0];
    res.status(202).json(mapCommand(c));
  }));
  app.get("/devices", requireAdmin, run(async (_req, res) => {
    const { rows } = await db.query("SELECT DISTINCT device_id FROM machines WHERE device_id IS NOT NULL");
    res.json(rows.map((r) => ({ deviceId: r.device_id, online: gateway.isOnline(r.device_id) })));
  }));

  app.get("/pos/stores/:id/config", requirePos, run(async (req, res) => {
    const { id } = req.params;
    const store = (await db.query("SELECT * FROM stores WHERE id = $1 AND active = true", [id])).rows[0];
    if (!store) throw new HttpError(404, "Loja não encontrada", "not_found");
    const machines = (await db.query("SELECT * FROM machines WHERE store_id = $1 AND active = true ORDER BY label", [id])).rows;
    const prices = (await db.query("SELECT * FROM prices WHERE store_id = $1", [id])).rows;
    const priceOf = (m: any) => m.price_override_cents ?? prices.find((p) => p.kind === m.kind)?.amount_cents ?? null;
    res.json({
      store: mapStore(store),
      paymentProviders: providers.names(),
      machines: machines.map((m) => ({
        id: m.id, kind: m.kind, label: m.label, priceCents: priceOf(m), online: gateway.isOnline(m.device_id),
      })),
    });
  }));

  app.post("/orders", requirePos, run(async (req, res) => {
    const b = z.object({ storeId: z.string(), machineIds: z.array(z.string()).min(1).max(20) }).parse(req.body);
    const key = req.headers["idempotency-key"];
    const { order, created } = await orders.create({
      storeId: b.storeId,
      machineIds: b.machineIds,
      idempotencyKey: typeof key === "string" && key ? key : undefined,
    });
    res.status(created ? 201 : 200).json(order);
  }));
  app.get("/orders/:id", requirePos, run(async (req, res) => {
    res.json(await orders.get(req.params.id));
  }));
  app.post("/orders/:id/payments", requirePos, run(async (req, res) => {
    const { id } = req.params;
    const b = z.object({ provider: z.string(), payload: z.unknown() }).parse(req.body);
    const { order, duplicate } = await orders.recordPayment(id, b.provider, b.payload);
    res.status(duplicate ? 200 : 201).json(order);
  }));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.code, message: err.message });
    if (err instanceof ZodError) return res.status(400).json({ error: "validation", issues: err.issues });
    if (isUniqueViolation(err)) return res.status(409).json({ error: "conflict", message: "Registro duplicado" });
    if (err.statusCode && err.statusCode < 500) return res.status(err.statusCode).json({ error: "bad_request", message: err.message });
    console.error(err);
    return res.status(500).json({ error: "internal" });
  });

  const sweepTimer = setInterval(() => void releases.sweep().catch(() => undefined), 5000);
  sweepTimer.unref();

  let server: http.Server | undefined;

  return {
    releases,
    async listen({ port, host }: { port: number; host?: string }) {
      server = await new Promise<http.Server>((resolve, reject) => {
        const s = app.listen(port, host ?? "0.0.0.0", () => resolve(s));
        s.once("error", reject);
      });
      return server;
    },
    async close() {
      clearInterval(sweepTimer);
      if (!server) return;
      await new Promise<void>((resolve, reject) => server!.close((err) => (err ? reject(err) : resolve())));
    },
    async inject({ method, url, headers = {}, payload }: InjectOptions) {
      const { default: request } = await import("supertest");
      const verb = method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete";
      let req = request(app)[verb](url);
      for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
      if (payload !== undefined && payload !== null) req = req.send(payload as object);
      const res = await req;
      return { statusCode: res.status, json: () => res.body };
    },
  };
}

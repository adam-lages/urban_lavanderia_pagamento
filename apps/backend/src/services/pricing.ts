import { randomUUID } from "node:crypto";
import type { Db } from "../db.js";
import { HttpError } from "../errors.js";
import { defaultCycleMinutes } from "./machines.js";

export interface PriceSchedule {
  startTime: string;
  endTime: string;
  amountCents: number;
  weekdays: number[];
}

export interface MachinePricing {
  machineId: string;
  label: string;
  code: string;
  kind: string;
  cycleMinutes: number;
  priceCents: number | null;
  schedules: PriceSchedule[];
}

function mapSchedule(r: any): PriceSchedule {
  return {
    startTime: r.start_time,
    endTime: r.end_time,
    amountCents: r.amount_cents,
    weekdays: String(r.weekdays).split(",").filter(Boolean).map(Number),
  };
}

function overlaps(a: PriceSchedule, b: PriceSchedule) {
  const sameDay = a.weekdays.some((d) => b.weekdays.includes(d));
  return sameDay && a.startTime < b.endTime && b.startTime < a.endTime;
}

function validate(schedules: PriceSchedule[]) {
  schedules.forEach((s, i) => {
    if (s.startTime >= s.endTime) {
      throw new HttpError(400, `Programação ${i + 1}: o horário final deve ser depois do inicial.`, "invalid_schedule");
    }
    if (schedules.slice(i + 1).some((other) => overlaps(s, other))) {
      throw new HttpError(400, `Programação ${i + 1}: conflita com outra no mesmo dia e horário.`, "schedule_overlap");
    }
  });
}

export class PricingService {
  constructor(private db: Db) {}

  async schedulesByMachine(machineIds: string[]) {
    const map = new Map<string, PriceSchedule[]>();
    if (!machineIds.length) return map;
    const placeholders = machineIds.map((_, i) => `$${i + 1}`).join(",");
    const { rows } = await this.db.query(
      `SELECT * FROM price_schedules WHERE machine_id IN (${placeholders}) ORDER BY start_time`,
      machineIds,
    );
    for (const r of rows) map.set(r.machine_id, [...(map.get(r.machine_id) ?? []), mapSchedule(r)]);
    return map;
  }

  async listForStore(storeId: string): Promise<MachinePricing[]> {
    const machines = (await this.db.query("SELECT * FROM machines WHERE store_id = $1 ORDER BY kind DESC, label", [storeId])).rows;
    const prices = (await this.db.query("SELECT kind, amount_cents FROM prices WHERE store_id = $1", [storeId])).rows;
    const schedules = await this.schedulesByMachine(machines.map((m) => m.id));
    return machines.map((m) => ({
      machineId: m.id,
      label: m.label,
      code: m.code ?? "",
      kind: m.kind,
      cycleMinutes: m.cycle_minutes ?? defaultCycleMinutes(m.kind),
      priceCents: m.price_override_cents ?? prices.find((p) => p.kind === m.kind)?.amount_cents ?? null,
      schedules: schedules.get(m.id) ?? [],
    }));
  }

  async save(machineId: string, input: { priceCents: number; schedules: PriceSchedule[] }) {
    const machine = (await this.db.query("SELECT store_id FROM machines WHERE id = $1", [machineId])).rows[0];
    if (!machine) throw new HttpError(404, "Máquina não encontrada", "not_found");
    validate(input.schedules);
    await this.db.tx(async (q) => {
      await q.query("UPDATE machines SET price_override_cents = $2 WHERE id = $1", [machineId, input.priceCents]);
      await q.query("DELETE FROM price_schedules WHERE machine_id = $1", [machineId]);
      for (const s of input.schedules) {
        await q.query(
          "INSERT INTO price_schedules (id, machine_id, start_time, end_time, amount_cents, weekdays, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [randomUUID(), machineId, s.startTime, s.endTime, s.amountCents, [...new Set(s.weekdays)].sort().join(","), new Date()],
        );
      }
    });
    const all = await this.listForStore(machine.store_id);
    return all.find((p) => p.machineId === machineId)!;
  }
}

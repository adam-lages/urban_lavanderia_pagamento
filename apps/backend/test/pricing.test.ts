import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADMIN, POS, seed, startStack, type Stack } from "./helpers.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
});
afterEach(async () => {
  await s.close();
});

const happyHour = { startTime: "08:00", endTime: "12:00", amountCents: 1490, weekdays: [2, 3] };

describe("preços por máquina", () => {
  it("lista o valor padrão da lavanderia por máquina", async () => {
    const { store } = await seed(s);
    const list = (await s.app.inject({ method: "GET", url: `/stores/${store.id}/pricing`, headers: ADMIN })).json();
    expect(list).toHaveLength(2);
    expect(list.find((m: any) => m.kind === "WASHER")).toMatchObject({ label: "Lavadora 1", priceCents: 1800, cycleMinutes: 30, schedules: [] });
    expect(list.find((m: any) => m.kind === "DRYER")).toMatchObject({ priceCents: 1200, cycleMinutes: 45 });
  });

  it("salva valor e programações e envia para o POS", async () => {
    const { store, washer } = await seed(s);
    const saved = await s.app.inject({
      method: "PUT",
      url: `/machines/${washer.id}/pricing`,
      headers: ADMIN,
      payload: { priceCents: 1590, schedules: [happyHour] },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({ priceCents: 1590, schedules: [happyHour] });

    const again = await s.app.inject({
      method: "PUT",
      url: `/machines/${washer.id}/pricing`,
      headers: ADMIN,
      payload: { priceCents: 1590, schedules: [] },
    });
    expect(again.json().schedules).toEqual([]);

    await s.app.inject({ method: "PUT", url: `/machines/${washer.id}/pricing`, headers: ADMIN, payload: { priceCents: 1590, schedules: [happyHour] } });
    const config = (await s.app.inject({ method: "GET", url: `/pos/stores/${store.id}/config`, headers: POS })).json();
    const m = config.machines.find((x: any) => x.id === washer.id);
    expect(m.priceCents).toBe(1590);
    expect(m.promotions).toEqual([happyHour]);
  });

  it("recusa horário invertido e programações que se sobrepõem", async () => {
    const { washer } = await seed(s);
    const put = (schedules: unknown[]) =>
      s.app.inject({ method: "PUT", url: `/machines/${washer.id}/pricing`, headers: ADMIN, payload: { priceCents: 1500, schedules } });
    expect((await put([{ ...happyHour, startTime: "13:00", endTime: "12:00" }])).statusCode).toBe(400);
    expect((await put([happyHour, { ...happyHour, startTime: "11:00", endTime: "14:00", weekdays: [3] }])).statusCode).toBe(400);
    expect((await put([happyHour, { ...happyHour, startTime: "11:00", endTime: "14:00", weekdays: [4] }])).statusCode).toBe(200);
    expect((await put([{ ...happyHour, weekdays: [] }])).statusCode).toBe(400);
  });
});

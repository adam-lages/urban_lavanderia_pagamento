import type { Overview } from "../api";

export const emptyOverview: Overview = {
  period: { from: "2026-10-27", to: "2026-10-27" },
  cycles: 0,
  revenueCents: 0,
  avgTicketCents: 0,
  machines: [],
  byDay: [{ date: "2026-10-27", cycles: 0, revenueCents: 0 }],
  byWeek: [],
  byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, cycles: 0, revenueCents: 0 })),
  kinds: { washers: 0, dryers: 0 },
  recurrence: {
    customers: 0,
    returning: 0,
    anonymousOrders: 0,
    buckets: [
      { label: "1 compra", customers: 0 },
      { label: "2 compras", customers: 0 },
      { label: "3 ou mais", customers: 0 },
    ],
  },
  signups: { month: "2026-10", total: 0, byDay: [{ date: "2026-10-01", count: 0, cumulative: 0 }] },
};

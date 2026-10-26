import { z } from "zod";
import { HttpError } from "../errors.js";
import type { PaymentProvider, PaymentResult } from "./provider.js";

const schema = z.object({
  externalId: z.string().min(1),
  outcome: z.enum(["approved", "declined"]).default("approved"),
  method: z.enum(["PIX", "DEBIT", "CREDIT"]).default("PIX"),
});

/** Provedor para desenvolvimento/testes: aprova ou nega conforme o payload. */
export class SimulatedProvider implements PaymentProvider {
  readonly name = "simulated";
  parse(payload: unknown, order: { totalCents: number }): PaymentResult {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new HttpError(400, "Payload simulado inválido", "invalid_payload");
    const { externalId, outcome, method } = parsed.data;
    return {
      externalId,
      status: outcome === "approved" ? "APPROVED" : "DECLINED",
      method,
      amountCents: order.totalCents,
      raw: parsed.data,
    };
  }
}

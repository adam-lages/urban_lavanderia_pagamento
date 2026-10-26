import { z } from "zod";
import { HttpError } from "../errors.js";
import type { PaymentProvider, PaymentResult } from "./provider.js";

/**
 * Normaliza o retorno `pay-response` do Deeplink da Stone (enviado pelo app Kotlin da P2).
 * Campos conforme o plano técnico; ainda NÃO validados contra o sandbox da Stone
 * (ex.: semântica exata de `code` e nomes de `type`). Ajustar na homologação.
 */
const schema = z.object({
  code: z.union([z.string(), z.number()]),
  itk: z.string().min(1),
  atk: z.string().optional(),
  authorization_code: z.string().optional(),
  authorization_date_time: z.string().optional(),
  brand: z.string().optional(),
  type: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
});

export class StoneDeeplinkProvider implements PaymentProvider {
  readonly name = "stone_deeplink";
  parse(payload: unknown, order: { totalCents: number }): PaymentResult {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new HttpError(400, "pay-response da Stone inválido", "invalid_payload");
    const p = parsed.data;
    const approved = String(p.code) === "0";
    return {
      externalId: p.itk,
      status: approved ? "APPROVED" : "DECLINED",
      method: p.type,
      amountCents: p.amount !== undefined ? Number(p.amount) : order.totalCents,
      raw: p,
    };
  }
}

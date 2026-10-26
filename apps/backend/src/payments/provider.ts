import { HttpError } from "../errors.js";

export type PaymentStatus = "APPROVED" | "DECLINED" | "ERROR";

export interface PaymentResult {
  /** Identificador único do pagamento no provedor (ex.: itk da Stone). Base da idempotência. */
  externalId: string;
  status: PaymentStatus;
  method?: string;
  amountCents: number;
  raw: unknown;
}

export interface OrderRef {
  id: string;
  totalCents: number;
}

/**
 * Interface de pagamento. O backend não conhece cartão/Pix: só recebe o resultado
 * normalizado. O app Kotlin da P2 (Stone Deeplink) entra como mais uma implementação.
 */
export interface PaymentProvider {
  readonly name: string;
  parse(payload: unknown, order: OrderRef): PaymentResult;
}

export class PaymentProviderRegistry {
  private providers = new Map<string, PaymentProvider>();
  register(p: PaymentProvider) {
    this.providers.set(p.name, p);
    return this;
  }
  get(name: string): PaymentProvider {
    const p = this.providers.get(name);
    if (!p) throw new HttpError(400, `Provedor de pagamento desconhecido: ${name}`, "unknown_provider");
    return p;
  }
  names() {
    return [...this.providers.keys()];
  }
}

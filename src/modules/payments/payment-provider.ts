import type { PaymentMethod, PaymentStatus } from '@prisma/client';
import type { Paise } from '../../shared/money';

export interface PaymentContext {
  orderId: string;
  orderNumber: string;
  amount: Paise;
  currency: string;
  customer: { id: string; email: string; phone: string | null; name: string };
}

export interface CreatePaymentResult {
  status: PaymentStatus;
  providerRef?: string;
  /** For redirect/SDK based gateways: what the client must do next. COD returns none. */
  nextAction?: { type: 'redirect' | 'sdk'; payload: Record<string, unknown> };
}

export interface PaymentRecord {
  id: string;
  provider: string;
  amount: Paise;
  collected: Paise;
  refunded: Paise;
  status: PaymentStatus;
  providerRef: string | null;
}

/**
 * Payment provider contract. Order placement, cart and inventory logic depend only on this
 * interface, so adding Razorpay/Stripe/PayU means adding a provider (plus its webhook route)
 * without touching the order workflow. Online providers must NOT be registered until real
 * credentials and signature-verified webhooks are configured.
 */
export interface PaymentProvider {
  readonly code: string;
  readonly method: PaymentMethod;
  readonly label: string;
  /** Called inside the order transaction. */
  createPayment(ctx: PaymentContext): Promise<CreatePaymentResult>;
  /** Confirm a payment (webhook/callback for gateways; manual collection for COD). */
  verifyPayment(payment: PaymentRecord, payload: { amount: Paise; reference?: string }): Promise<{ status: PaymentStatus; collected: Paise }>;
  refundPayment(payment: PaymentRecord, amount: Paise, reason: string): Promise<{ status: 'PENDING' | 'PROCESSED' | 'FAILED'; reference?: string }>;
  getPaymentStatus(payment: PaymentRecord): Promise<PaymentStatus>;
}

/**
 * Cash on Delivery. Payment stays COD_PENDING until cash collection is confirmed after
 * delivery — orders are never marked PAID when placed or shipped. Refunds for COD orders are
 * paid out manually (bank transfer / UPI) and recorded by an admin.
 */
export class CashOnDeliveryProvider implements PaymentProvider {
  readonly code = 'cod';
  readonly method = 'COD' as const;
  readonly label = 'Cash on Delivery';

  async createPayment(): Promise<CreatePaymentResult> {
    return { status: 'COD_PENDING' };
  }

  async verifyPayment(payment: PaymentRecord, payload: { amount: Paise }) {
    const collected = payment.collected + payload.amount;
    return { status: (collected >= payment.amount ? 'PAID' : 'COD_PENDING') as PaymentStatus, collected };
  }

  async refundPayment() {
    return { status: 'PENDING' as const };
  }

  async getPaymentStatus(payment: PaymentRecord) {
    return payment.status;
  }
}

export class PaymentRegistry {
  private providers = new Map<string, PaymentProvider>();
  constructor(providers: PaymentProvider[]) {
    for (const p of providers) this.providers.set(p.method, p);
  }
  get(method: PaymentMethod): PaymentProvider {
    const p = this.providers.get(method);
    if (!p) throw new Error(`Payment method ${method} is not configured`);
    return p;
  }
  methods() {
    return [...this.providers.values()].map((p) => ({ method: p.method, code: p.code, label: p.label }));
  }
}

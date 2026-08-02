import { createHmac, timingSafeEqual } from "node:crypto";

export const supportedCurrencies = ["UZS"] as const;
export type CurrencyCode = (typeof supportedCurrencies)[number];

export type PaymentProviderCode = "MOCK" | "MANUAL";
export type PaymentMethodCode = "CASH" | "ONLINE" | "WALLET" | "BANK_TRANSFER" | "MANUAL_TRANSFER";
export type PaymentTargetType = "BOOKING" | "PARCEL_ORDER" | "DRIVER_PAYOUT" | "ADJUSTMENT";
export type PaymentStatus =
  | "CREATED"
  | "REQUIRES_ACTION"
  | "PROCESSING"
  | "AUTHORIZED"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";
export type PaymentIntentStatus =
  | "CREATED"
  | "PENDING"
  | "REQUIRES_ACTION"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";
export type RefundStatus =
  | "REQUESTED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REJECTED"
  | "PARTIAL";

export interface Money {
  amountMinor: bigint;
  currency: CurrencyCode;
}

export interface PricingInput {
  targetType: PaymentTargetType;
  baseMinor: bigint;
  currency: CurrencyCode;
  feeRateBps?: number;
  fixedFeeMinor?: bigint;
}

export interface PricingResult {
  subtotalMinor: bigint;
  feeMinor: bigint;
  totalMinor: bigint;
  currency: CurrencyCode;
  ruleSnapshot: {
    targetType: PaymentTargetType;
    feeRateBps: number;
    fixedFeeMinor: string;
  };
}

export interface PaymentProviderIntentInput {
  paymentId: string;
  amountMinor: bigint;
  currency: CurrencyCode;
  idempotencyKey: string;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProviderIntent {
  provider: PaymentProviderCode;
  providerReference: string;
  status: PaymentIntentStatus;
  clientAction?: {
    type: "NONE" | "REDIRECT" | "TOKEN" | "INSTRUCTIONS";
    url?: string;
    token?: string;
    instructions?: Record<string, unknown>;
  };
}

export interface PaymentWebhookVerification {
  ok: boolean;
  provider: PaymentProviderCode;
  eventId?: string;
  eventType?: string;
  providerReference?: string;
  status?: PaymentIntentStatus;
  amountMinor?: bigint;
  currency?: CurrencyCode;
  reason?: string;
  payload: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  readonly provider: PaymentProviderCode;
  createIntent(input: PaymentProviderIntentInput): Promise<PaymentProviderIntent>;
  getStatus(providerReference: string): Promise<PaymentIntentStatus>;
  refund(input: {
    providerReference: string;
    amountMinor: bigint;
    currency: CurrencyCode;
    idempotencyKey: string;
  }): Promise<{ providerReference: string; status: RefundStatus }>;
}

export interface PaymentWebhookVerifier {
  readonly provider: PaymentProviderCode;
  verify(input: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
    secret?: string;
  }): PaymentWebhookVerification;
}

export interface PaymentReconciliationAdapter {
  readonly provider: PaymentProviderCode;
  listProviderPayments(input: { from: Date; to: Date }): Promise<
    Array<{
      providerReference: string;
      amountMinor: bigint;
      currency: CurrencyCode;
      status: PaymentIntentStatus;
    }>
  >;
}

export interface PayoutProviderAdapter {
  readonly provider: PaymentProviderCode;
  createPayout(input: {
    payoutId: string;
    amountMinor: bigint;
    currency: CurrencyCode;
    idempotencyKey: string;
  }): Promise<{ providerReference: string; status: "PROCESSING" | "PAID" | "FAILED" }>;
}

export class PaymentProviderRegistry {
  private readonly adapters = new Map<PaymentProviderCode, PaymentProviderAdapter>();

  register(adapter: PaymentProviderAdapter) {
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: PaymentProviderCode) {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`Payment provider is not registered: ${provider}`);
    return adapter;
  }
}

export function assertCurrency(currency: string): asserts currency is CurrencyCode {
  if (!supportedCurrencies.includes(currency as CurrencyCode)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
}

export function money(
  amountMinor: bigint | number | string,
  currency: CurrencyCode = "UZS",
): Money {
  assertCurrency(currency);
  const normalized = BigInt(amountMinor);
  if (normalized < 0n) throw new Error("Money amount must not be negative");
  return { amountMinor: normalized, currency };
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return { amountMinor: left.amountMinor + right.amountMinor, currency: left.currency };
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  if (right.amountMinor > left.amountMinor) throw new Error("Money subtraction would be negative");
  return { amountMinor: left.amountMinor - right.amountMinor, currency: left.currency };
}

export function calculateBps(amountMinor: bigint, bps: number) {
  if (!Number.isInteger(bps) || bps < 0)
    throw new Error("Basis points must be a non-negative integer");
  return (amountMinor * BigInt(bps) + 9_999n) / 10_000n;
}

export function calculatePricing(input: PricingInput): PricingResult {
  const base = money(input.baseMinor, input.currency);
  const feeRateBps = input.feeRateBps ?? 0;
  const fixedFeeMinor = input.fixedFeeMinor ?? 0n;
  if (fixedFeeMinor < 0n) throw new Error("Fixed fee must not be negative");
  const feeMinor = calculateBps(base.amountMinor, feeRateBps) + fixedFeeMinor;
  return {
    subtotalMinor: base.amountMinor,
    feeMinor,
    totalMinor: base.amountMinor + feeMinor,
    currency: base.currency,
    ruleSnapshot: {
      targetType: input.targetType,
      feeRateBps,
      fixedFeeMinor: fixedFeeMinor.toString(),
    },
  };
}

export function refundableAmount(payment: { paidMinor: bigint; refundedMinor: bigint }) {
  if (payment.refundedMinor > payment.paidMinor)
    throw new Error("Refunded amount exceeds paid amount");
  return payment.paidMinor - payment.refundedMinor;
}

export function assertRefundAllowed(
  payment: { status: PaymentStatus; paidMinor: bigint; refundedMinor: bigint },
  amountMinor: bigint,
) {
  if (!["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
    throw new Error("Refund is allowed only for successful payments");
  }
  if (amountMinor <= 0n) throw new Error("Refund amount must be positive");
  if (amountMinor > refundableAmount(payment))
    throw new Error("Refund amount exceeds refundable amount");
}

export function transitionPaymentStatus(current: PaymentStatus, next: PaymentStatus) {
  if (current === next) return current;
  const allowed: Record<PaymentStatus, PaymentStatus[]> = {
    CREATED: ["REQUIRES_ACTION", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
    REQUIRES_ACTION: ["PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
    PROCESSING: ["AUTHORIZED", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
    AUTHORIZED: ["SUCCEEDED", "CANCELLED", "EXPIRED"],
    SUCCEEDED: ["PARTIALLY_REFUNDED", "REFUNDED"],
    FAILED: [],
    CANCELLED: [],
    EXPIRED: [],
    PARTIALLY_REFUNDED: ["REFUNDED"],
    REFUNDED: [],
  };
  if (!allowed[current].includes(next))
    throw new Error(`Invalid payment transition ${current} -> ${next}`);
  return next;
}

export function transitionIntentStatus(current: PaymentIntentStatus, next: PaymentIntentStatus) {
  if (current === next) return current;
  const allowed: Record<PaymentIntentStatus, PaymentIntentStatus[]> = {
    CREATED: [
      "PENDING",
      "REQUIRES_ACTION",
      "PROCESSING",
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
      "EXPIRED",
    ],
    PENDING: ["REQUIRES_ACTION", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
    REQUIRES_ACTION: ["PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
    PROCESSING: ["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
    SUCCEEDED: [],
    FAILED: [],
    CANCELLED: [],
    EXPIRED: [],
  };
  if (!allowed[current].includes(next))
    throw new Error(`Invalid payment intent transition ${current} -> ${next}`);
  return next;
}

export function assertBalancedLedger(
  entries: Array<{ entryType: "DEBIT" | "CREDIT"; amountMinor: bigint; currency: CurrencyCode }>,
) {
  if (entries.length < 2) throw new Error("Ledger transaction requires at least two entries");
  const currency = entries[0]?.currency;
  if (!currency) throw new Error("Ledger currency is required");
  let debit = 0n;
  let credit = 0n;
  for (const entry of entries) {
    if (entry.currency !== currency) throw new Error("Ledger entries must use one currency");
    if (entry.amountMinor <= 0n) throw new Error("Ledger entry amount must be positive");
    if (entry.entryType === "DEBIT") debit += entry.amountMinor;
    else credit += entry.amountMinor;
  }
  if (debit !== credit) throw new Error("Ledger transaction is not balanced");
}

export class MockPaymentProviderAdapter
  implements
    PaymentProviderAdapter,
    PaymentWebhookVerifier,
    PaymentReconciliationAdapter,
    PayoutProviderAdapter
{
  readonly provider = "MOCK" as const;

  async createIntent(input: PaymentProviderIntentInput): Promise<PaymentProviderIntent> {
    return {
      provider: this.provider,
      providerReference: `mock_${input.paymentId}_${input.idempotencyKey}`,
      status: "REQUIRES_ACTION",
      clientAction: {
        type: "INSTRUCTIONS",
        instructions: { action: "mock_complete", paymentId: input.paymentId },
      },
    };
  }

  async getStatus() {
    return "PENDING" as const;
  }

  async refund(input: { idempotencyKey: string }) {
    return {
      providerReference: `mock_refund_${input.idempotencyKey}`,
      status: "SUCCEEDED" as const,
    };
  }

  verify(input: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
    secret?: string;
    toleranceSeconds?: number;
  }): PaymentWebhookVerification {
    const signature = headerValue(input.headers, "x-nodex-mock-signature");
    const timestamp = headerValue(input.headers, "x-nodex-mock-timestamp");
    const payload = safeJson(input.rawBody);
    if (!timestamp || !/^\d+$/.test(timestamp)) {
      return {
        ok: false,
        provider: this.provider,
        reason: "INVALID_TIMESTAMP",
        payload: redactWebhookPayload(payload),
      };
    }
    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (ageSeconds > (input.toleranceSeconds ?? 300)) {
      return {
        ok: false,
        provider: this.provider,
        reason: "TIMESTAMP_OUT_OF_TOLERANCE",
        payload: redactWebhookPayload(payload),
      };
    }
    const expected =
      input.secret &&
      createHmac("sha256", input.secret).update(`${timestamp}.${input.rawBody}`).digest("hex");
    if (expected && (!signature || !timingSafeStringEqual(signature, expected))) {
      return {
        ok: false,
        provider: this.provider,
        reason: "INVALID_SIGNATURE",
        payload: redactWebhookPayload(payload),
      };
    }
    const result: PaymentWebhookVerification = {
      ok: true,
      provider: this.provider,
      eventId: String(payload.eventId ?? ""),
      eventType: String(payload.eventType ?? "payment.updated"),
      providerReference: String(payload.providerReference ?? ""),
      status: String(payload.status ?? "SUCCEEDED") as PaymentIntentStatus,
      currency: (payload.currency ?? "UZS") as CurrencyCode,
      payload: redactWebhookPayload(payload),
    };
    if (payload.amountMinor !== undefined) result.amountMinor = BigInt(String(payload.amountMinor));
    return result;
  }

  async listProviderPayments() {
    return [];
  }

  async createPayout(input: { payoutId: string }) {
    return { providerReference: `mock_payout_${input.payoutId}`, status: "PAID" as const };
  }
}

export function signMockWebhook(
  rawBody: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
) {
  return {
    timestamp: String(timestamp),
    signature: createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"),
  };
}

export class ManualPaymentProviderAdapter implements PaymentProviderAdapter, PayoutProviderAdapter {
  readonly provider = "MANUAL" as const;

  async createIntent(input: PaymentProviderIntentInput): Promise<PaymentProviderIntent> {
    return {
      provider: this.provider,
      providerReference: `manual_${input.paymentId}_${input.idempotencyKey}`,
      status: "PENDING",
      clientAction: { type: "NONE" },
    };
  }

  async getStatus() {
    return "PENDING" as const;
  }

  async refund(input: { idempotencyKey: string }) {
    return {
      providerReference: `manual_refund_${input.idempotencyKey}`,
      status: "PROCESSING" as const,
    };
  }

  async createPayout(input: { payoutId: string }) {
    return { providerReference: `manual_payout_${input.payoutId}`, status: "PROCESSING" as const };
  }
}

function assertSameCurrency(left: Money, right: Money) {
  if (left.currency !== right.currency) throw new Error("Currency mismatch");
}

function headerValue(headers: Record<string, string | string[] | undefined>, name: string) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function safeJson(rawBody: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function redactWebhookPayload(payload: Record<string, unknown>) {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    redacted[key] = /secret|token|authorization|password|signature|raw/i.test(key)
      ? "[REDACTED]"
      : value;
  }
  return redacted;
}

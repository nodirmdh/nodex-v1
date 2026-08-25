import { describe, expect, test } from "vitest";
import {
  MockPaymentProviderAdapter,
  assertBalancedLedger,
  assertRefundAllowed,
  calculateBps,
  calculatePricing,
  money,
  refundableAmount,
  signMockWebhook,
  transitionIntentStatus,
  transitionPaymentStatus,
} from "./index";

describe("money", () => {
  test("uses integer minor units and rejects negative values", () => {
    expect(money(12_000n).amountMinor).toBe(12_000n);
    expect(() => money(-1n)).toThrow("must not be negative");
  });

  test("rounds percentage fees up in integer arithmetic", () => {
    expect(calculateBps(100_001n, 150)).toBe(1_501n);
  });

  test("calculates pricing without floats", () => {
    const result = calculatePricing({
      targetType: "BOOKING",
      baseMinor: 100_000n,
      currency: "UZS",
      feeRateBps: 250,
      fixedFeeMinor: 1_000n,
    });
    expect(result.feeMinor).toBe(3_500n);
    expect(result.totalMinor).toBe(103_500n);
  });
});

describe("state machines", () => {
  test("allows idempotent and valid payment transitions", () => {
    expect(transitionPaymentStatus("CREATED", "PROCESSING")).toBe("PROCESSING");
    expect(transitionPaymentStatus("SUCCEEDED", "SUCCEEDED")).toBe("SUCCEEDED");
    expect(() => transitionPaymentStatus("FAILED", "SUCCEEDED")).toThrow(
      "Invalid payment transition",
    );
  });

  test("allows valid intent transitions", () => {
    expect(transitionIntentStatus("CREATED", "REQUIRES_ACTION")).toBe("REQUIRES_ACTION");
    expect(() => transitionIntentStatus("SUCCEEDED", "FAILED")).toThrow(
      "Invalid payment intent transition",
    );
  });
});

describe("refunds and ledger", () => {
  test("prevents over-refunds", () => {
    const payment = { status: "SUCCEEDED" as const, paidMinor: 10_000n, refundedMinor: 4_000n };
    expect(refundableAmount(payment)).toBe(6_000n);
    expect(() => assertRefundAllowed(payment, 7_000n)).toThrow("exceeds refundable");
  });

  test("requires balanced ledger entries", () => {
    expect(() =>
      assertBalancedLedger([
        { entryType: "DEBIT", amountMinor: 1_000n, currency: "UZS" },
        { entryType: "CREDIT", amountMinor: 1_000n, currency: "UZS" },
      ]),
    ).not.toThrow();
    expect(() =>
      assertBalancedLedger([
        { entryType: "DEBIT", amountMinor: 1_000n, currency: "UZS" },
        { entryType: "CREDIT", amountMinor: 999n, currency: "UZS" },
      ]),
    ).toThrow("not balanced");
  });
});

describe("mock provider", () => {
  test("verifies mock webhook signatures and payload", () => {
    const adapter = new MockPaymentProviderAdapter();
    const rawBody = JSON.stringify({
      eventId: "evt_1",
      providerReference: "mock_payment",
      amountMinor: "10000",
      currency: "UZS",
      status: "SUCCEEDED",
    });
    const signed = signMockWebhook(rawBody, "secret", 1_800_000_000);
    const verified = adapter.verify({
      headers: {
        "x-nodex-mock-signature": signed.signature,
        "x-nodex-mock-timestamp": signed.timestamp,
      },
      rawBody,
      secret: "secret",
      toleranceSeconds: Number.MAX_SAFE_INTEGER,
    });
    expect(verified.ok).toBe(true);
    expect(verified.amountMinor).toBe(10_000n);

    const rejected = adapter.verify({ headers: {}, rawBody, secret: "secret" });
    expect(rejected.ok).toBe(false);
  });
});

import { describe, expect, test } from "vitest";
import {
  analyticsEventSchema,
  normalizeMinorUnit,
  paymentIntentCreateSchema,
  providerAllowedInProduction,
  refundRequestSchema,
  requireReasonForFinancialAdminAction,
  safePaymentStatusForPublic,
} from "./index";

describe("payment validation", () => {
  test("accepts cash and online payment intent inputs", () => {
    expect(
      paymentIntentCreateSchema.parse({
        targetType: "BOOKING",
        targetId: "booking_1",
        method: "ONLINE",
      }),
    ).toMatchObject({ provider: "MOCK" });
    expect(() =>
      paymentIntentCreateSchema.parse({
        targetType: "BOOKING",
        targetId: "booking_1",
        method: "WALLET",
      }),
    ).toThrow();
  });

  test("normalizes minor units and rejects negative amounts", () => {
    expect(normalizeMinorUnit("12000")).toBe(12_000n);
    expect(() => normalizeMinorUnit("-1")).toThrow("negative");
  });

  test("requires refund reasons and validates analytics events", () => {
    expect(
      refundRequestSchema.parse({ paymentId: "pay_1", reason: "CLIENT_CANCELLATION" }),
    ).toBeTruthy();
    expect(
      analyticsEventSchema.parse({ type: "PAYMENT_SUCCEEDED", entityType: "Payment" }),
    ).toBeTruthy();
    expect(() =>
      analyticsEventSchema.parse({
        type: "SUPPORT_TICKET_CREATED",
        payload: { supportDescription: "private support text" },
      }),
    ).toThrow("unsafe PII key");
    expect(() =>
      analyticsEventSchema.parse({
        type: "PAYMENT_SUCCEEDED",
        payload: { routeId: "route_1", amountBucket: "100k" },
      }),
    ).not.toThrow();
  });

  test("guards admin reasons and production mock provider", () => {
    expect(requireReasonForFinancialAdminAction("manual correction").ok).toBe(true);
    expect(requireReasonForFinancialAdminAction("").ok).toBe(false);
    expect(providerAllowedInProduction("MOCK", true).ok).toBe(false);
    expect(providerAllowedInProduction("MANUAL", true).ok).toBe(true);
  });

  test("maps internal payment status to public-safe status", () => {
    expect(safePaymentStatusForPublic("AUTHORIZED")).toBe("PROCESSING");
    expect(safePaymentStatusForPublic("SUCCEEDED")).toBe("SUCCEEDED");
  });
});

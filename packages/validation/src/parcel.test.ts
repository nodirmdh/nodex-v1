import { describe, expect, it } from "vitest";
import {
  calculateParcelPriceMinor,
  evaluateParcelTransition,
  parcelCodeCanAttempt,
  parcelDraftSchema,
} from "./index";

describe("parcel validation", () => {
  it("accepts a valid parcel draft and rejects oversized dimensions", () => {
    const valid = parcelDraftSchema.parse({
      tripId: "trip-1",
      categoryCode: "DOCUMENTS",
      title: "Documents",
      description: "Passport copies in a sealed envelope",
      weightGrams: 500,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 5,
      declaredValueMinor: 100000n,
      senderName: "Sender",
      recipientName: "Recipient",
      recipientPhone: "+998901112233",
      pickupLabel: "Nukus station",
      destinationLabel: "Urgench station",
    });
    expect(valid.categoryCode).toBe("DOCUMENTS");

    expect(() =>
      parcelDraftSchema.parse({
        ...valid,
        lengthCm: 1000,
      }),
    ).toThrow();
  });

  it("calculates backend-only parcel price in minor units", () => {
    expect(calculateParcelPriceMinor({ baseParcelPriceMinor: 2500000n, weightGrams: 4000 })).toBe(
      2500000n,
    );
    expect(calculateParcelPriceMinor({ baseParcelPriceMinor: 2500000n, weightGrams: 12000 })).toBe(
      3500000n,
    );
  });
});

describe("parcel state machine", () => {
  it("allows the recommended lifecycle", () => {
    expect(evaluateParcelTransition("CREATED", "SUBMIT")).toEqual({
      ok: true,
      toStatus: "ACCEPTED",
      idempotent: false,
    });
    expect(evaluateParcelTransition("ACCEPTED", "HANDOVER")).toMatchObject({
      ok: true,
      toStatus: "HANDED_TO_DRIVER",
    });
    expect(evaluateParcelTransition("HANDED_TO_DRIVER", "START_TRANSIT")).toMatchObject({
      ok: true,
      toStatus: "IN_TRANSIT",
    });
    expect(evaluateParcelTransition("READY_FOR_PICKUP", "DELIVER")).toMatchObject({
      ok: true,
      toStatus: "DELIVERED",
    });
  });

  it("blocks terminal and unsafe transitions", () => {
    expect(evaluateParcelTransition("DELIVERED", "CANCEL_SENDER")).toMatchObject({
      ok: false,
      code: "PARCEL_INVALID_TRANSITION",
    });
    expect(evaluateParcelTransition("ACCEPTED", "DELIVER")).toMatchObject({
      ok: false,
      code: "PARCEL_INVALID_TRANSITION",
    });
  });
});

describe("parcel code guard", () => {
  const future = new Date("2026-08-01T12:00:00.000Z");
  const now = new Date("2026-08-01T10:00:00.000Z");

  it("allows active code attempts", () => {
    expect(
      parcelCodeCanAttempt({
        status: "ACTIVE",
        expiresAt: future,
        attemptsCount: 0,
        maxAttempts: 5,
        now,
      }),
    ).toEqual({ ok: true, code: "PARCEL_CODE_ATTEMPT_ALLOWED" });
  });

  it("rejects expired, used, locked, and exhausted codes", () => {
    expect(
      parcelCodeCanAttempt({
        status: "ACTIVE",
        expiresAt: now,
        attemptsCount: 0,
        maxAttempts: 5,
        now,
      }),
    ).toMatchObject({ ok: false, code: "PARCEL_CODE_EXPIRED" });

    expect(
      parcelCodeCanAttempt({
        status: "ACTIVE",
        expiresAt: future,
        attemptsCount: 0,
        maxAttempts: 5,
        verifiedAt: now,
        now,
      }),
    ).toMatchObject({ ok: false, code: "PARCEL_CODE_USED" });

    expect(
      parcelCodeCanAttempt({
        status: "ACTIVE",
        expiresAt: future,
        attemptsCount: 5,
        maxAttempts: 5,
        now,
      }),
    ).toMatchObject({ ok: false, code: "PARCEL_CODE_MAX_ATTEMPTS" });
  });
});

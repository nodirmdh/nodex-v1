import { describe, expect, it } from "vitest";
import {
  boardingCodeCanAttempt,
  evaluateTripLocationWrite,
  evaluateTripTransition,
  tripLocationPointSchema,
  tripStartPinVerifySchema,
} from "./index";

describe("trip operation state machine", () => {
  it("allows the primary passenger lifecycle", () => {
    expect(evaluateTripTransition("PUBLISHED", "START_BOARDING")).toEqual({
      ok: true,
      toStatus: "BOARDING",
      idempotent: false,
    });
    expect(evaluateTripTransition("BOARDING", "START_TRIP")).toEqual({
      ok: true,
      toStatus: "IN_PROGRESS",
      idempotent: false,
    });
    expect(evaluateTripTransition("IN_PROGRESS", "COMPLETE_TRIP")).toEqual({
      ok: true,
      toStatus: "COMPLETED",
      idempotent: false,
    });
  });

  it("returns idempotent success for same-state retries", () => {
    expect(evaluateTripTransition("BOARDING", "START_BOARDING")).toEqual({
      ok: true,
      toStatus: "BOARDING",
      idempotent: true,
    });
  });

  it("blocks unsafe transitions", () => {
    expect(evaluateTripTransition("BLOCKED", "START_BOARDING")).toMatchObject({
      ok: false,
      code: "TRIP_INVALID_TRANSITION",
    });
    expect(evaluateTripTransition("COMPLETED", "CANCEL_TRIP")).toMatchObject({
      ok: false,
      code: "TRIP_INVALID_TRANSITION",
    });
  });
});

describe("boarding code guard", () => {
  const future = new Date("2026-08-01T10:10:00.000Z");
  const now = new Date("2026-08-01T10:00:00.000Z");

  it("allows active unexpired single-use code attempts", () => {
    expect(
      boardingCodeCanAttempt({
        status: "ACTIVE",
        expiresAt: future,
        attemptsCount: 0,
        maxAttempts: 5,
        now,
      }),
    ).toEqual({ ok: true, code: "BOARDING_CODE_ATTEMPT_ALLOWED" });
  });

  it("rejects used, expired, locked, and exhausted codes", () => {
    expect(
      boardingCodeCanAttempt({
        status: "ACTIVE",
        expiresAt: future,
        attemptsCount: 0,
        maxAttempts: 5,
        verifiedAt: now,
        now,
      }),
    ).toMatchObject({ ok: false, code: "BOARDING_CODE_USED" });

    expect(
      boardingCodeCanAttempt({
        status: "ACTIVE",
        expiresAt: now,
        attemptsCount: 0,
        maxAttempts: 5,
        now,
      }),
    ).toMatchObject({ ok: false, code: "BOARDING_CODE_EXPIRED" });

    expect(
      boardingCodeCanAttempt({
        status: "ACTIVE",
        expiresAt: future,
        attemptsCount: 0,
        maxAttempts: 5,
        lockedAt: now,
        now,
      }),
    ).toMatchObject({ ok: false, code: "BOARDING_CODE_LOCKED" });

    expect(
      boardingCodeCanAttempt({
        status: "ACTIVE",
        expiresAt: future,
        attemptsCount: 5,
        maxAttempts: 5,
        now,
      }),
    ).toMatchObject({ ok: false, code: "BOARDING_CODE_MAX_ATTEMPTS" });
  });
});

describe("trip core tracking and start PIN guards", () => {
  const now = new Date("2026-08-01T10:00:00.000Z");

  it("accepts a four digit trip start PIN and rejects boarding-code length", () => {
    expect(tripStartPinVerifySchema.parse({ pin: "1234" }).pin).toBe("1234");
    expect(() => tripStartPinVerifySchema.parse({ pin: "123456" })).toThrow();
  });

  it("validates trip location points from platform geolocation", () => {
    expect(
      tripLocationPointSchema.parse({
        bookingId: "booking-1",
        latitude: 42.46,
        longitude: 59.61,
        accuracyMeters: 18,
        source: "PERIODIC",
      }),
    ).toMatchObject({ source: "PERIODIC", bookingId: "booking-1" });
    expect(() => tripLocationPointSchema.parse({ latitude: 95, longitude: 59.61 })).toThrow();
  });

  it("allows periodic tracking only during active trips", () => {
    expect(
      evaluateTripLocationWrite({ tripStatus: "IN_PROGRESS", source: "PERIODIC", now }),
    ).toMatchObject({ ok: true });
    expect(evaluateTripLocationWrite({ tripStatus: "BOARDING", source: "PERIODIC", now })).toEqual({
      ok: false,
      code: "LOCATION_TRIP_NOT_ACTIVE",
    });
  });

  it("throttles repeated periodic points but permits critical lifecycle points", () => {
    expect(
      evaluateTripLocationWrite({
        tripStatus: "IN_PROGRESS",
        source: "PERIODIC",
        lastRecordedAt: new Date("2026-08-01T09:59:30.000Z"),
        now,
        minIntervalMs: 60000,
      }),
    ).toEqual({ ok: false, code: "LOCATION_UPDATE_THROTTLED" });
    expect(
      evaluateTripLocationWrite({
        tripStatus: "BOARDING",
        source: "PIN_VERIFIED",
        lastRecordedAt: new Date("2026-08-01T09:59:30.000Z"),
        now,
      }),
    ).toMatchObject({ ok: true, critical: true });
  });
});

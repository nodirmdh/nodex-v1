import { describe, expect, it } from "vitest";
import { boardingCodeCanAttempt, evaluateTripTransition } from "./index";

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

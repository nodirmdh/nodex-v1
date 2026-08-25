import { describe, expect, it } from "vitest";
import {
  calculateRatingAggregate,
  calculateReliabilityLevel,
  canCreateUserBlock,
  evaluateReviewEligibility,
  evaluateSafetyTransition,
  reviewSchema,
  stripUnsafeReviewText,
} from "./index";

const now = new Date("2026-08-02T00:00:00.000Z");

describe("review validation", () => {
  it("requires rating bounds and strips unsafe text", () => {
    expect(() =>
      reviewSchema.parse({
        type: "DRIVER_BY_CLIENT",
        revieweeUserId: "driver-1",
        overallRating: 6,
      }),
    ).toThrow();
    expect(stripUnsafeReviewText("<script>alert(1)</script>Good driver javascript:alert(1)")).toBe(
      "alert(1)Good driver alert(1)",
    );
  });

  it("allows eligible completed trip review and rejects self review", () => {
    expect(
      evaluateReviewEligibility({
        type: "DRIVER_BY_CLIENT",
        reviewerUserId: "client-1",
        revieweeUserId: "driver-1",
        entityStatus: "COMPLETED",
        reviewerParticipated: true,
        revieweeIsCounterpart: true,
        completedAt: new Date("2026-08-01T00:00:00.000Z"),
        now,
      }),
    ).toEqual({ ok: true });

    expect(
      evaluateReviewEligibility({
        type: "CLIENT_BY_DRIVER",
        reviewerUserId: "user-1",
        revieweeUserId: "user-1",
        entityStatus: "COMPLETED",
        reviewerParticipated: true,
        revieweeIsCounterpart: true,
        completedAt: new Date("2026-08-01T00:00:00.000Z"),
        now,
      }),
    ).toMatchObject({ ok: false, code: "REVIEW_SELF_FORBIDDEN" });
  });

  it("rejects closed review windows", () => {
    expect(
      evaluateReviewEligibility({
        type: "PARCEL_DRIVER_BY_SENDER",
        reviewerUserId: "sender-1",
        revieweeUserId: "driver-1",
        entityStatus: "DELIVERED",
        reviewerParticipated: true,
        revieweeIsCounterpart: true,
        completedAt: new Date("2026-06-01T00:00:00.000Z"),
        now,
      }),
    ).toMatchObject({ ok: false, code: "REVIEW_WINDOW_CLOSED" });
  });
});

describe("rating aggregates and reliability", () => {
  it("calculates distribution and average", () => {
    expect(calculateRatingAggregate([5, 4, 5, 3])).toEqual({
      averageRating: 4.25,
      ratingCount: 4,
      ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 },
    });
  });

  it("calculates transparent reliability levels", () => {
    expect(calculateReliabilityLevel({ completedTripsCount: 31 })).toBe("HIGHLY_RELIABLE");
    expect(calculateReliabilityLevel({ completedBookingsCount: 12, clientNoShowCount: 1 })).toBe(
      "RELIABLE",
    );
    expect(calculateReliabilityLevel({ completedBookingsCount: 3, clientNoShowCount: 2 })).toBe(
      "AT_RISK",
    );
    expect(calculateReliabilityLevel({ accountRestrictionCount: 1 })).toBe("RESTRICTED");
  });
});

describe("safety and blocks", () => {
  it("enforces safety report transitions", () => {
    expect(evaluateSafetyTransition("SUBMITTED", "TRIAGE")).toMatchObject({
      ok: true,
      toStatus: "TRIAGED",
    });
    expect(evaluateSafetyTransition("SUBMITTED", "RESOLVE")).toMatchObject({
      ok: false,
      code: "SAFETY_REPORT_INVALID_TRANSITION",
    });
  });

  it("rejects self block", () => {
    expect(canCreateUserBlock("user-1", "user-1")).toMatchObject({
      ok: false,
      code: "USER_BLOCK_SELF_FORBIDDEN",
    });
    expect(canCreateUserBlock("user-1", "user-2")).toEqual({ ok: true });
  });
});

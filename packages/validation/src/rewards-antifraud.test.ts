import { describe, expect, it } from "vitest";
import {
  calculateDriverMilestoneProgress,
  evaluateRewardFraud,
  referralCreateSchema,
  rewardReviewDecisionSchema,
  rewardStatusForFraudStatus,
} from "./index";

const config = {
  clientTripTickets: 1,
  driverTripTickets: 1,
  clientReferralTickets: 1,
  driverReferralTickets: 1,
  milestoneTargetCount: 50,
  milestoneRewardValue: 20_000_000,
  minTripDurationMinutes: 20,
  minMovementMeters: 500,
  mediumReviewThreshold: 2,
  highReviewThreshold: 3,
};

const qualifyingTrip = {
  pinVerified: true,
  gpsPoints: [
    { latitude: 42.46, longitude: 59.61, recordedAt: new Date("2026-09-01T08:30:00.000Z") },
    { latitude: 42.47, longitude: 59.62, recordedAt: new Date("2026-09-01T09:15:00.000Z") },
  ],
  tripStartedAt: new Date("2026-09-01T08:30:00.000Z"),
  tripCompletedAt: new Date("2026-09-01T09:15:00.000Z"),
};

describe("reward anti-fraud evaluation", () => {
  it("auto-approves a qualifying completed trip", () => {
    const result = evaluateRewardFraud(qualifyingTrip, config);
    expect(result.status).toBe("AUTO_APPROVED");
    expect(result.riskLevel).toBe("LOW");
    expect(result.reasons).toEqual([]);
    expect(rewardStatusForFraudStatus(result.status)).toBe("CONFIRMED");
  });

  it("sends missing start PIN and GPS signals to manual review", () => {
    const result = evaluateRewardFraud(
      {
        pinVerified: false,
        gpsPoints: [],
        tripStartedAt: new Date("2026-09-01T08:30:00.000Z"),
        tripCompletedAt: new Date("2026-09-01T09:15:00.000Z"),
      },
      config,
    );
    expect(result.status).toBe("PENDING_REVIEW");
    expect(result.reasons).toEqual(
      expect.arrayContaining(["START_PIN_NOT_VERIFIED", "NO_GPS_POINTS"]),
    );
  });

  it("flags abnormal trip duration", () => {
    const result = evaluateRewardFraud(
      {
        ...qualifyingTrip,
        tripCompletedAt: new Date("2026-09-01T08:35:00.000Z"),
      },
      config,
    );
    expect(result.reasons).toContain("ABNORMAL_TRIP_DURATION");
  });

  it("rejects duplicate reward sources", () => {
    const result = evaluateRewardFraud({ ...qualifyingTrip, duplicateReward: true }, config);
    expect(result.status).toBe("REJECTED");
    expect(result.riskLevel).toBe("CRITICAL");
  });

  it("rejects self referrals and referral cycles", () => {
    expect(evaluateRewardFraud({ ...qualifyingTrip, referralSelf: true }, config).status).toBe(
      "REJECTED",
    );
    expect(evaluateRewardFraud({ ...qualifyingTrip, referralCycle: true }, config).status).toBe(
      "REJECTED",
    );
  });
});

describe("driver milestone reward progress", () => {
  it("tracks remaining trips before the 50-trip milestone", () => {
    expect(calculateDriverMilestoneProgress({ qualifyingTrips: 36, targetCount: 50 })).toEqual({
      completed: 36,
      target: 50,
      remaining: 14,
      reached: false,
    });
  });

  it("marks the milestone reached at the configured threshold", () => {
    expect(
      calculateDriverMilestoneProgress({ qualifyingTrips: 50, targetCount: 50 }),
    ).toMatchObject({
      remaining: 0,
      reached: true,
    });
  });
});
describe("reward admin/referral validation", () => {
  it("accepts explicit admin approve and reject decisions with reasons", () => {
    expect(
      rewardReviewDecisionSchema.parse({ decision: "APPROVE", reason: "GPS and PIN verified" }),
    ).toMatchObject({
      decision: "APPROVE",
    });
    expect(
      rewardReviewDecisionSchema.parse({ decision: "REJECT", reason: "Duplicate source" }),
    ).toMatchObject({
      decision: "REJECT",
    });
  });

  it("requires a referred user and defaults referral role to client", () => {
    expect(referralCreateSchema.parse({ referredUserId: "user_2", code: "FRIEND" })).toMatchObject({
      referredUserId: "user_2",
      roleContext: "CLIENT",
    });
  });
});

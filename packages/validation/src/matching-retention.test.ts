import { describe, expect, it } from "vitest";
import {
  canMatchWaitlistEntryToTrip,
  returnTripDraftSchema,
  savedRouteCreateSchema,
  waitlistEntryCreateSchema,
  type WaitlistMatchEntryContext,
  type WaitlistMatchTripContext,
} from "./index";

const now = new Date("2026-09-01T00:00:00.000Z");

function trip(overrides: Partial<WaitlistMatchTripContext> = {}): WaitlistMatchTripContext {
  return {
    originCityId: "nukus",
    destinationCityId: "urgench",
    status: "PUBLISHED",
    availableSeatCount: 3,
    passengerSeatCapacity: 4,
    wholeCarPriceMinor: 320000n,
    departureAtUtc: new Date("2026-09-02T08:30:00.000Z"),
    cancelledAt: null,
    blockedAt: null,
    ...overrides,
  };
}

function entry(overrides: Partial<WaitlistMatchEntryContext> = {}): WaitlistMatchEntryContext {
  return {
    originCityId: "nukus",
    destinationCityId: "urgench",
    requestedDate: new Date("2026-09-02T00:00:00.000Z"),
    passengerCount: 2,
    wholeCar: false,
    preferredDepartureAtUtc: new Date("2026-09-02T09:00:00.000Z"),
    timeWindowHours: 2,
    expiresAt: new Date("2026-09-10T00:00:00.000Z"),
    status: "ACTIVE",
    ...overrides,
  };
}

describe("matching retention validation", () => {
  it("creates a valid waitlist entry payload", () => {
    const parsed = waitlistEntryCreateSchema.parse({
      originCityId: "nukus",
      destinationCityId: "urgench",
      requestedDate: "2026-09-02T00:00:00.000Z",
      preferredDepartureAtUtc: "2026-09-02T08:30:00.000Z",
      passengerCount: 2,
      wholeCar: false,
    });

    expect(parsed.passengerCount).toBe(2);
    expect(parsed.wholeCar).toBe(false);
  });

  it("rejects same origin and destination for waitlist", () => {
    expect(() =>
      waitlistEntryCreateSchema.parse({
        originCityId: "nukus",
        destinationCityId: "nukus",
        requestedDate: "2026-09-02T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("matches an active entry on route, requested date, seats, and time window", () => {
    expect(canMatchWaitlistEntryToTrip(trip(), entry(), { now })).toBe(true);
  });

  it("does not match expired or cancelled entries", () => {
    expect(
      canMatchWaitlistEntryToTrip(
        trip(),
        entry({ expiresAt: new Date("2026-08-31T00:00:00.000Z") }),
        {
          now,
        },
      ),
    ).toBe(false);
    expect(canMatchWaitlistEntryToTrip(trip(), entry({ status: "CANCELLED" }), { now })).toBe(
      false,
    );
  });

  it("does not match wrong route, wrong date, or outside time window", () => {
    expect(
      canMatchWaitlistEntryToTrip(trip({ destinationCityId: "khiva" }), entry(), { now }),
    ).toBe(false);
    expect(
      canMatchWaitlistEntryToTrip(
        trip(),
        entry({ requestedDate: new Date("2026-09-03T00:00:00.000Z") }),
        {
          now,
        },
      ),
    ).toBe(false);
    expect(
      canMatchWaitlistEntryToTrip(
        trip(),
        entry({
          preferredDepartureAtUtc: new Date("2026-09-02T14:00:00.000Z"),
          timeWindowHours: 2,
        }),
        { now },
      ),
    ).toBe(false);
  });

  it("does not match inactive trips or insufficient seats", () => {
    expect(canMatchWaitlistEntryToTrip(trip({ status: "DRAFT" }), entry(), { now })).toBe(false);
    expect(
      canMatchWaitlistEntryToTrip(trip({ availableSeatCount: 1 }), entry({ passengerCount: 2 }), {
        now,
      }),
    ).toBe(false);
    expect(
      canMatchWaitlistEntryToTrip(
        trip({ cancelledAt: new Date("2026-09-01T10:00:00.000Z") }),
        entry(),
        { now },
      ),
    ).toBe(false);
  });

  it("requires full availability and whole-car pricing for whole-car entries", () => {
    expect(
      canMatchWaitlistEntryToTrip(trip({ availableSeatCount: 4 }), entry({ wholeCar: true }), {
        now,
      }),
    ).toBe(true);
    expect(
      canMatchWaitlistEntryToTrip(trip({ availableSeatCount: 3 }), entry({ wholeCar: true }), {
        now,
      }),
    ).toBe(false);
    expect(
      canMatchWaitlistEntryToTrip(
        trip({ availableSeatCount: 4, wholeCarPriceMinor: null }),
        entry({ wholeCar: true }),
        { now },
      ),
    ).toBe(false);
  });

  it("normalizes saved route payloads", () => {
    const parsed = savedRouteCreateSchema.parse({
      originCityId: "nukus",
      destinationCityId: "urgench",
      preferredDepartureWindow: "morning",
    });

    expect(parsed.preferredDepartureWindow).toBe("morning");
  });

  it("requires explicit return departure time", () => {
    expect(returnTripDraftSchema.parse({ departureAtUtc: "2026-09-03T18:00:00.000Z" })).toEqual({
      departureAtUtc: new Date("2026-09-03T18:00:00.000Z"),
    });
  });
});

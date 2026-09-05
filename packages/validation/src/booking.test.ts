import { describe, expect, it } from "vitest";
import {
  bookingConfirmSchema,
  bookingHoldSchema,
  bookingSeatPriceMinor,
  generateSeatLayout,
} from "./index";

describe("generateSeatLayout", () => {
  it("generates stable seat keys from passenger capacity", () => {
    expect(generateSeatLayout(4)).toEqual([
      { seatKey: "FRONT_RIGHT", label: "Front right", row: 0, column: 1, seatType: "FRONT" },
      { seatKey: "ROW_1_LEFT", label: "Row 1 left", row: 1, column: 0, seatType: "REAR" },
      { seatKey: "ROW_1_RIGHT", label: "Row 1 right", row: 1, column: 1, seatType: "REAR" },
      { seatKey: "ROW_2_LEFT", label: "Row 2 left", row: 2, column: 0, seatType: "STANDARD" },
    ]);
  });

  it("caps generated seats to supported MVP range", () => {
    expect(generateSeatLayout(99)).toHaveLength(16);
    expect(generateSeatLayout(0)).toHaveLength(1);
  });
});

describe("bookingHoldSchema", () => {
  it("requires passenger count to match booking request shape later in service", () => {
    const parsed = bookingHoldSchema.parse({
      tripId: "trip_1",
      seatKeys: ["FRONT_RIGHT"],
      passengerCount: 1,
    });

    expect(parsed.type).toBe("SEAT");
    expect(parsed.paymentMethod).toBe("CASH");
  });

  it("accepts scheduled hold metadata without changing seat shape", () => {
    const parsed = bookingHoldSchema.parse({
      tripId: "trip_1",
      type: "MULTI_SEAT",
      seatKeys: ["FRONT_RIGHT", "ROW_1_LEFT"],
      passengerCount: 2,
      requestedDepartureAtUtc: "2026-09-03T03:30:00.000Z",
    });

    expect(parsed.requestedDepartureAtUtc?.toISOString()).toBe("2026-09-03T03:30:00.000Z");
    expect(parsed.seatKeys).toHaveLength(2);
  });
});

describe("bookingConfirmSchema", () => {
  it("accepts baggage, preferences, pickup location, and schedule data", () => {
    const parsed = bookingConfirmSchema.parse({
      passengers: [
        { firstName: "Nodir", seatKey: "FRONT_RIGHT" },
        { firstName: "Guest", ageCategory: "CHILD", seatKey: "ROW_1_LEFT" },
      ],
      baggage: [{ type: "SUITCASE", quantity: 2 }],
      preferences: { types: ["CHILD", "NO_SMOKING"], driverComment: "Главный вход" },
      pickupLocation: {
        latitude: 42.46,
        longitude: 59.61,
        label: "Вокзал",
        comment: "У главного входа",
      },
      schedule: { option: "CUSTOM", requestedDepartureAtUtc: "2026-09-03T03:30:00.000Z" },
      consentAccepted: true,
    });

    expect(parsed.baggage[0]?.quantity).toBe(2);
    expect(parsed.preferences.types).toEqual(["CHILD", "NO_SMOKING"]);
    expect(parsed.pickupLocation?.label).toBe("Вокзал");
    expect(parsed.schedule.requestedDepartureAtUtc?.toISOString()).toBe("2026-09-03T03:30:00.000Z");
  });

  it("keeps no-baggage bookings separate from passenger count", () => {
    const parsed = bookingConfirmSchema.parse({
      passengers: [{ firstName: "Nodir", seatKey: "FRONT_RIGHT" }],
      baggage: [],
      consentAccepted: true,
    });

    expect(parsed.baggage).toEqual([]);
    expect(parsed.preferences.types).toEqual([]);
  });
});

describe("bookingSeatPriceMinor", () => {
  it("applies the frozen ENVO seat modifiers", () => {
    expect(bookingSeatPriceMinor(100_000n, "FRONT_RIGHT")).toBe(120_000n);
    expect(bookingSeatPriceMinor(100_000n, "ROW_1_CENTER")).toBe(80_000n);
    expect(bookingSeatPriceMinor(100_000n, "ROW_1_LEFT")).toBe(100_000n);
  });
});

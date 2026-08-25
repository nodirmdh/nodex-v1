import { describe, expect, it } from "vitest";
import { bookingHoldSchema, generateSeatLayout } from "./index";

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
});

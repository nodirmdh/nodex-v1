import { describe, expect, it } from "vitest";
import {
  baggageItemsForChoice,
  buildBookingCorePayload,
  selectedSeatsForBooking,
} from "./booking-core";

describe("booking core payload", () => {
  it("builds a single-seat booking without baggage", () => {
    const payload = buildBookingCorePayload({
      tripId: "trip-1",
      bookingType: "SEAT",
      passengerCount: 1,
      selectedSeats: ["FRONT_RIGHT"],
      availableSeatKeys: ["FRONT_RIGHT", "ROW_1_LEFT"],
      baggageType: "NONE",
      baggageQuantity: 1,
      preferenceTypes: [],
      driverComment: "",
      pickupLocation: { latitude: null, longitude: null, label: "", comment: "" },
      scheduleOption: "NOW",
      requestedDepartureAtUtc: null,
    });

    expect(payload.hold.seatKeys).toEqual(["FRONT_RIGHT"]);
    expect(payload.confirm.baggage).toEqual([]);
  });

  it("keeps multi-seat passengers in one client booking", () => {
    const seats = selectedSeatsForBooking({
      bookingType: "MULTI_SEAT",
      selectedSeats: ["FRONT_RIGHT", "ROW_1_LEFT"],
      availableSeatKeys: ["FRONT_RIGHT", "ROW_1_LEFT", "ROW_1_RIGHT"],
    });

    expect(seats).toEqual(["FRONT_RIGHT", "ROW_1_LEFT"]);
  });

  it("books every available passenger seat for whole-car requests", () => {
    const seats = selectedSeatsForBooking({
      bookingType: "WHOLE_CAR",
      selectedSeats: ["FRONT_RIGHT"],
      availableSeatKeys: ["FRONT_RIGHT", "ROW_1_LEFT"],
    });

    expect(seats).toEqual(["FRONT_RIGHT", "ROW_1_LEFT"]);
  });

  it("keeps baggage separate from passenger count", () => {
    expect(baggageItemsForChoice("SUITCASE", 3)).toEqual([{ type: "SUITCASE", quantity: 3 }]);
  });

  it("includes preferences, pickup location, and scheduled departure", () => {
    const payload = buildBookingCorePayload({
      tripId: "trip-1",
      bookingType: "SEAT",
      passengerCount: 1,
      selectedSeats: ["FRONT_RIGHT"],
      availableSeatKeys: ["FRONT_RIGHT"],
      baggageType: "CABIN_BAG",
      baggageQuantity: 1,
      preferenceTypes: ["CHILD", "NO_SMOKING"],
      driverComment: "У главного входа",
      pickupLocation: {
        latitude: 42.46,
        longitude: 59.61,
        label: "Вокзал",
        comment: "Главный вход",
      },
      scheduleOption: "CUSTOM",
      requestedDepartureAtUtc: "2026-09-03T03:30:00.000Z",
    });

    expect(payload.confirm.preferences.types).toEqual(["CHILD", "NO_SMOKING"]);
    expect(payload.confirm.pickupLocation.label).toBe("Вокзал");
    expect(payload.confirm.schedule.requestedDepartureAtUtc).toBe("2026-09-03T03:30:00.000Z");
  });
});

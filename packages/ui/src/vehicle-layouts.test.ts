import { describe, expect, it } from "vitest";
import { envoVehicleLayoutId, envoVehiclePassengerCapacity } from "./vehicle-layouts";

describe("ENVO vehicle layouts", () => {
  it("uses four passenger seats for approved sedan models", () => {
    expect(envoVehiclePassengerCapacity({ model: "Chevrolet Cobalt" })).toBe(4);
    expect(envoVehiclePassengerCapacity({ model: "Chevrolet Tracker" })).toBe(4);
  });

  it("supports six and seven passenger minivan configurations", () => {
    expect(envoVehicleLayoutId({ model: "Hyundai Staria", passengerCapacity: 6 })).toBe("minivan_6p");
    expect(envoVehicleLayoutId({ model: "Hyundai Staria", passengerCapacity: 7 })).toBe("minivan_7p");
    expect(envoVehiclePassengerCapacity({ model: "Hyundai Staria" })).toBe(7);
  });
});

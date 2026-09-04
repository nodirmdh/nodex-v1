import { describe, expect, it } from "vitest";
import {
  cabinSeats,
  cabinTemplateForModel,
  seatPriceMinor,
  sevenSeatPreview,
  seatLabelForKey,
  selectableSeatKeys,
} from "./cabin-model";

describe("client cabin model", () => {
  it("keeps backend seat keys while exposing human labels", () => {
    expect(seatLabelForKey(cabinSeats, "FRONT_RIGHT")).toBe("Front passenger");
    expect(seatLabelForKey(cabinSeats, "ROW_1_LEFT")).toBe("Rear left");
    expect(seatLabelForKey(cabinSeats, "ROW_1_RIGHT")).toBe("Rear right");
  });

  it("uses only available passenger seats for whole-car requests", () => {
    expect(selectableSeatKeys(cabinSeats)).toEqual([
      "FRONT_RIGHT",
      "ROW_1_LEFT",
      "ROW_1_CENTER",
      "ROW_1_RIGHT",
    ]);
  });

  it("keeps seven-passenger minivan previews data-driven", () => {
    expect(selectableSeatKeys(sevenSeatPreview)).toHaveLength(7);
  });

  it("keeps front and center seat pricing adjustments", () => {
    expect(
      seatPriceMinor(
        1000000,
        cabinSeats.find((seat) => seat.key === "FRONT_RIGHT"),
      ),
    ).toBe(1200000);
    expect(
      seatPriceMinor(
        1000000,
        cabinSeats.find((seat) => seat.key === "ROW_1_CENTER"),
      ),
    ).toBe(800000);
  });

  it("maps vehicle models to reusable cabin templates", () => {
    expect(cabinTemplateForModel("Chevrolet Cobalt", 5)).toBe("SEDAN_5");
    expect(cabinTemplateForModel("Chevrolet Tracker", 5)).toBe("SUV_5");
    expect(cabinTemplateForModel("7-seat SUV", 7)).toBe("SUV_7");
    expect(cabinTemplateForModel("Hyundai Staria", 8)).toBe("MINIVAN_8");
  });
});

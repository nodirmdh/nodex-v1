import { describe, expect, it } from "vitest";
import { tripSearchQuerySchema } from "./index";

describe("tripSearchQuerySchema", () => {
  it("keeps string false as false for optional filters", () => {
    const parsed = tripSearchQuerySchema.parse({
      originCityId: "origin",
      destinationCityId: "destination",
      date: "2026-08-08",
      parcelSupported: "false",
      luggageRequired: "true",
    });

    expect(parsed.parcelSupported).toBe(false);
    expect(parsed.luggageRequired).toBe(true);
  });

  it("rejects same-city searches", () => {
    expect(() =>
      tripSearchQuerySchema.parse({
        originCityId: "nukus",
        destinationCityId: "nukus",
        date: "2026-08-08",
      }),
    ).toThrow();
  });
});

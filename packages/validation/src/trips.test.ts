import { describe, expect, it } from "vitest";
import { tripDraftSchema, tripTariffs } from "./index";

describe("trip draft contract", () => {
  it("accepts the frozen ENVO tariffs and positive base seat price", () => {
    for (const tariff of tripTariffs) {
      const parsed = tripDraftSchema.parse({ tariff, pricePerSeatMinor: 120_000 });
      expect(parsed.tariff).toBe(tariff);
      expect(parsed.pricePerSeatMinor).toBe(120_000n);
    }
  });

  it("rejects unknown tariffs and zero base seat price", () => {
    expect(() => tripDraftSchema.parse({ tariff: "BUSINESS" })).toThrow();
    expect(() => tripDraftSchema.parse({ pricePerSeatMinor: 0 })).toThrow();
  });

  it("rejects same-city and past departures", () => {
    expect(() =>
      tripDraftSchema.parse({ originCityId: "city_1", destinationCityId: "city_1" }),
    ).toThrow();
    expect(() =>
      tripDraftSchema.parse({ departureAtUtc: new Date(Date.now() - 60_000) }),
    ).toThrow();
  });
});

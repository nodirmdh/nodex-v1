import { describe, expect, it } from "vitest";
import { ManualMapsAdapter, distanceMetersBetween } from "./index";

describe("maps", () => {
  it("falls back to manual geocoding", async () => {
    const result = await new ManualMapsAdapter().geocode("Nukus");
    expect(result[0]?.source).toBe("manual");
  });
});

it("calculates plausible movement between saved points", () => {
  const meters = distanceMetersBetween({ lat: 42.46, lng: 59.61 }, { lat: 42.47, lng: 59.62 });
  expect(meters).toBeGreaterThan(1000);
  expect(meters).toBeLessThan(2000);
});

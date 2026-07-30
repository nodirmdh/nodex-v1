import { describe, expect, it } from "vitest";
import { ManualMapsAdapter } from "./index";

describe("maps", () => {
  it("falls back to manual geocoding", async () => {
    const result = await new ManualMapsAdapter().geocode("Nukus");
    expect(result[0]?.source).toBe("manual");
  });
});

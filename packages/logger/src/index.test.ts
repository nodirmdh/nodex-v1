import { describe, expect, it } from "vitest";
import { redactionPaths } from "./index";

describe("logger", () => {
  it("redacts auth and personal fields", () => {
    expect(redactionPaths).toContain("*.initData");
    expect(redactionPaths).toContain("*.phone");
  });
});

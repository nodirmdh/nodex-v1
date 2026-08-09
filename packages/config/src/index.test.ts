import { describe, expect, it } from "vitest";
import { isSupportedLocale, parseAppEnv } from "./index";

describe("config", () => {
  it("validates required environment", () => {
    const env = parseAppEnv({
      DATABASE_URL: "postgresql://nodex:nodex@localhost:5432/nodex",
      REDIS_URL: "redis://localhost:6387",
      JWT_SECRET: "local-secret-with-enough-length",
    });

    expect(env.API_PORT).toBe(4000);
  });

  it("supports ru uz kaa locales", () => {
    expect(isSupportedLocale("kaa")).toBe(true);
    expect(isSupportedLocale("kk")).toBe(false);
  });
});

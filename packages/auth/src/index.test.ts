import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  defineAbilityFor,
  signSessionToken,
  validateTelegramInitData,
  verifySessionToken,
  verifyTelegramInitData,
} from "./index";

function makeInitData(botToken: string, input: { authDate?: number; user?: string } = {}) {
  const authDate = String(input.authDate ?? Math.floor(Date.now() / 1000));
  const pairs = new URLSearchParams({
    auth_date: authDate,
    query_id: "q1",
    user: input.user ?? '{"id":1,"first_name":"Test"}',
  });
  const dataCheckString = [...pairs.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  pairs.set("hash", hash);
  return pairs.toString();
}

describe("auth foundation", () => {
  it("verifies Telegram initData", () => {
    expect(verifyTelegramInitData(makeInitData("token"), "token")).toBe(true);
  });

  it("rejects expired Telegram initData", () => {
    const initData = makeInitData("token", { authDate: Math.floor(Date.now() / 1000) - 90000 });
    expect(validateTelegramInitData(initData, "token").error).toBe("AUTH_INIT_DATA_EXPIRED");
  });

  it("rejects forged Telegram initData", () => {
    const initData = makeInitData("token").replace("Test", "Forged");
    expect(validateTelegramInitData(initData, "token").error).toBe("AUTH_INIT_DATA_INVALID");
  });

  it("rejects malformed Telegram user JSON", () => {
    const initData = makeInitData("token", { user: "{bad-json" });
    expect(validateTelegramInitData(initData, "token").error).toBe("AUTH_INIT_DATA_INVALID");
  });

  it("signs and verifies session tokens", async () => {
    const token = await signSessionToken({ sub: "user_1" }, "secret-secret-secret");
    const result = await verifySessionToken(token, "secret-secret-secret");
    expect(result.payload.sub).toBe("user_1");
  });

  it("builds ability rules", () => {
    expect(defineAbilityFor(["DRIVER"]).can("create", "Trip")).toBe(true);
  });
});

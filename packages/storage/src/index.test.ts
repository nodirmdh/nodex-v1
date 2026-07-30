import { describe, expect, it } from "vitest";
import { NoopFileScanner } from "./index";

describe("storage", () => {
  it("approves files in local noop scanner", async () => {
    await expect(new NoopFileScanner().scan("file")).resolves.toBe("APPROVED");
  });
});

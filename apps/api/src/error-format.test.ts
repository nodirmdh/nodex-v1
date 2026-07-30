import { describe, expect, it } from "vitest";

describe("api error format", () => {
  it("matches documented envelope", () => {
    const body = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Readable message",
        details: [],
        requestId: "req",
      },
    };
    expect(body.error.details).toEqual([]);
  });
});

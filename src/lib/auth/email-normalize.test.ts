import { describe, expect, it } from "vitest";

import { normalizeEmailAddress } from "./email-normalize";

describe("normalizeEmailAddress", () => {
  it("trims and lowercases so mixed-case emails are one identity", () => {
    expect(normalizeEmailAddress("  Test@Example.com  ")).toBe("test@example.com");
    expect(normalizeEmailAddress("test@example.com")).toBe("test@example.com");
  });
});

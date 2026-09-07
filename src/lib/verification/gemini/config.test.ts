import { describe, expect, it } from "vitest";

import { GEMINI_API_KEY_ENV, isGeminiConfigured } from "./config";

describe("Gemini configuration", () => {
  it("uses a server-only env var name", () => {
    expect(GEMINI_API_KEY_ENV).toBe("GEMINI_API_KEY");
    expect(GEMINI_API_KEY_ENV.startsWith("NEXT_PUBLIC_")).toBe(false);
  });

  it("reports unavailable when the key is missing", () => {
    const previous = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(isGeminiConfigured()).toBe(false);
    if (previous == null) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  });
});

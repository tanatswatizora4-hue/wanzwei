import { describe, expect, it } from "vitest";

import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_API_KEY_ENV,
  getGeminiModel,
  isGeminiConfigured,
} from "./config";

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

  it("defaults to an available Flash model and stays overridable", () => {
    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-3.5-flash");
    const previous = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;
    expect(getGeminiModel()).toBe("gemini-3.5-flash");
    process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";
    expect(getGeminiModel()).toBe("gemini-3.1-flash-lite");
    if (previous == null) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previous;
  });
});

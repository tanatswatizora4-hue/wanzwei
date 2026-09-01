import { afterEach, describe, expect, it } from "vitest";

import {
  assertDangerousScriptAllowed,
  assertNotProductionUnlessAllowed,
  looksLikeProductionTarget,
  requireScriptEnv,
} from "./script-guards";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env.WANZWEI_ALLOW_DESTRUCTIVE = ORIGINAL.WANZWEI_ALLOW_DESTRUCTIVE;
  process.env.WANZWEI_ALLOW_PRODUCTION = ORIGINAL.WANZWEI_ALLOW_PRODUCTION;
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_DB_URL = ORIGINAL.SUPABASE_DB_URL;
  process.env.WANZWEI_TEST_ENV = ORIGINAL.WANZWEI_TEST_ENV;
});

describe("script guards", () => {
  it("fails closed without an explicit destructive acknowledgement", () => {
    delete process.env.WANZWEI_ALLOW_DESTRUCTIVE;
    expect(() => assertDangerousScriptAllowed("db:seed")).toThrow(
      /WANZWEI_ALLOW_DESTRUCTIVE/,
    );
  });

  it("detects the production Supabase project ref", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://irgkeksrittimdwwxckl.supabase.co";
    delete process.env.SUPABASE_DB_URL;
    expect(looksLikeProductionTarget()).toBe(true);
    expect(() => assertNotProductionUnlessAllowed("db:seed")).toThrow(
      /WANZWEI_ALLOW_PRODUCTION/,
    );
  });

  it("requires seed/bootstrap identity environment variables", () => {
    delete process.env.WANZWEI_TEST_ENV;
    expect(() => requireScriptEnv("WANZWEI_TEST_ENV")).toThrow(
      /WANZWEI_TEST_ENV is required/,
    );
  });
});

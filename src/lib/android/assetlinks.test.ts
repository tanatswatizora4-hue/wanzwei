import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  ANDROID_PACKAGE_ID,
  assetLinksWithSha256,
  digitalAssetLinks,
} from "./assetlinks";

describe("digital asset links", () => {
  it("does not ship a fabricated fingerprint", () => {
    expect(ANDROID_PACKAGE_ID).toBe("app.wanzwei.android");
    expect(digitalAssetLinks).toEqual([]);
    expect(existsSync("public/.well-known/assetlinks.json")).toBe(false);
  });

  it("accepts a well-formed SHA-256 fingerprint later", () => {
    const fingerprint = Array.from({ length: 32 }, (_, i) =>
      i.toString(16).padStart(2, "0"),
    )
      .join(":")
      .toUpperCase();
    const statements = assetLinksWithSha256(fingerprint);
    expect(statements[0]?.target.package_name).toBe(ANDROID_PACKAGE_ID);
    expect(statements[0]?.target.sha256_cert_fingerprints).toEqual([
      fingerprint,
    ]);
  });

  it("rejects a placeholder fingerprint", () => {
    expect(() => assetLinksWithSha256("REPLACE_WITH_PLAY_APP_SIGNING_SHA256")).toThrow(
      /SHA-256 fingerprint/,
    );
  });
});

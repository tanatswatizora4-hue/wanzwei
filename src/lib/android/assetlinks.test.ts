import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  ANDROID_PACKAGE_ID,
  ANDROID_SHA256_CERT_FINGERPRINTS,
  assetLinksWithSha256,
  digitalAssetLinks,
} from "./assetlinks";

const LOCAL_UPLOAD_SHA256 =
  "C0:14:72:F7:4F:1C:4D:B2:0E:8C:1A:A1:39:07:EB:67:24:23:4C:7C:BB:D3:DD:93:B3:A3:79:33:E1:28:FF:01";

describe("digital asset links", () => {
  it("publishes the local release certificate for app.wanzwei.android", () => {
    expect(ANDROID_PACKAGE_ID).toBe("app.wanzwei.android");
    expect(existsSync("public/.well-known/assetlinks.json")).toBe(false);
    expect(ANDROID_SHA256_CERT_FINGERPRINTS).toContain(LOCAL_UPLOAD_SHA256);
    expect(digitalAssetLinks).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "app.wanzwei.android",
          sha256_cert_fingerprints: [LOCAL_UPLOAD_SHA256],
        },
      },
    ]);
    expect(JSON.parse(JSON.stringify(digitalAssetLinks))).toEqual(
      digitalAssetLinks,
    );
  });

  it("accepts an additional Play App Signing fingerprint without dropping the local cert", () => {
    const play = Array.from({ length: 32 }, (_, i) =>
      (i + 1).toString(16).padStart(2, "0"),
    )
      .join(":")
      .toUpperCase();
    const statements = assetLinksWithSha256(LOCAL_UPLOAD_SHA256, play);
    expect(statements[0]?.target.package_name).toBe(ANDROID_PACKAGE_ID);
    expect(statements[0]?.target.sha256_cert_fingerprints).toEqual([
      LOCAL_UPLOAD_SHA256,
      play,
    ]);
  });

  it("rejects a placeholder fingerprint", () => {
    expect(() => assetLinksWithSha256("REPLACE_WITH_PLAY_APP_SIGNING_SHA256")).toThrow(
      /SHA-256 fingerprint/,
    );
  });
});

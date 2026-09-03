import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Android TWA secret surface", () => {
  it("does not embed service-role keys, OAuth secrets, or private signing material", () => {
    const files = [
      "android/app/build.gradle",
      "android/app/src/main/AndroidManifest.xml",
      "android/app/src/main/res/values/strings.xml",
      "android/twa-manifest.json",
      "src/lib/android/assetlinks.ts",
      "src/app/.well-known/assetlinks.json/route.ts",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/service_role/i);
      expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE/);
      expect(source).not.toMatch(/BEGIN (RSA )?PRIVATE KEY/);
      expect(source).not.toMatch(/client_secret/i);
      expect(source).not.toMatch(/eyJhbGciOi/);
    }
  });
});

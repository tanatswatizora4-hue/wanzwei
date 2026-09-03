import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ANDROID_HOST, ANDROID_PACKAGE_ID, ANDROID_SITE } from "./assetlinks";

describe("Android TWA project", () => {
  const gradle = readFileSync("android/app/build.gradle", "utf8");
  const manifest = readFileSync(
    "android/app/src/main/AndroidManifest.xml",
    "utf8",
  );
  const twaManifest = readFileSync("android/twa-manifest.json", "utf8");

  it("uses the Play package, origin, and target SDK 36", () => {
    expect(ANDROID_PACKAGE_ID).toBe("app.wanzwei.android");
    expect(ANDROID_SITE).toBe("https://wanzwei.vercel.app");
    expect(gradle).toContain('namespace "app.wanzwei.android"');
    expect(gradle).toContain('applicationId "app.wanzwei.android"');
    expect(gradle).toMatch(/compileSdk\s+36/);
    expect(gradle).toMatch(/targetSdk\s+36/);
    expect(gradle).toContain("androidbrowserhelper:2.7.3");
    expect(manifest).toContain(
      "com.google.androidbrowserhelper.trusted.LauncherActivity",
    );
    expect(manifest).toContain(`${ANDROID_SITE}/`);
    expect(twaManifest).toContain(`"packageId": "${ANDROID_PACKAGE_ID}"`);
    expect(twaManifest).toContain(`"host": "${ANDROID_HOST}"`);
  });

  it("is a TWA, not an unrestricted product WebView, and avoids extra storage permissions", () => {
    expect(manifest).not.toContain("android.webkit.WebView");
    expect(manifest).not.toContain("android.permission.CAMERA");
    expect(manifest).not.toContain("READ_MEDIA");
    expect(manifest).not.toContain("READ_EXTERNAL_STORAGE");
    expect(manifest).toContain("android.permission.INTERNET");
    expect(manifest).toContain("FALLBACK_STRATEGY");
    expect(manifest).toContain("customtabs");
  });

  it("declares App Links for confirmation without bypassing the human POST", () => {
    expect(manifest).toContain('android:autoVerify="true"');
    expect(manifest).toContain('android:host="wanzwei.vercel.app"');
    expect(manifest).toContain('android:pathPrefix="/auth/confirm"');
    expect(manifest).toContain('android:pathPrefix="/auth/callback"');
    expect(manifest).toContain('android:pathPrefix="/login"');
    expect(manifest).toContain('android:pathPrefix="/signup"');
    expect(manifest).toContain('android:pathPrefix="/reset-password"');
    expect(manifest).not.toContain("native Google Sign-In");
  });
});

import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("TWA web installability without auth-unsafe service workers", () => {
  it("ships a Wanzwei standalone manifest with production icons", () => {
    const source = readFileSync("src/app/manifest.ts", "utf8");
    expect(source).toContain('name: "Wanzwei"');
    expect(source).toContain('short_name: "Wanzwei"');
    expect(source).toContain('display: "standalone"');
    expect(source).toContain('start_url: "/"');
    expect(source).toContain('theme_color: "#1B1463"');
    expect(source).toContain('background_color: "#1B1463"');
    expect(source).toContain("/icons/icon-192.png");
    expect(source).toContain("/icons/icon-512.png");
    expect(source).toContain("/icons/maskable-512.png");
    expect(source).toContain('purpose: "maskable"');
    expect(source).not.toContain("prefer_related_applications");

    for (const file of [
      "public/icons/icon-192.png",
      "public/icons/icon-512.png",
      "public/icons/maskable-192.png",
      "public/icons/maskable-512.png",
      "public/icons/apple-touch-icon.png",
    ]) {
      expect(existsSync(file), file).toBe(true);
    }
  });

  it("does not register or intercept with an application service worker", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const nextConfig = readFileSync("next.config.ts", "utf8");

    expect(existsSync("public/sw.js")).toBe(false);
    expect(existsSync("src/components/pwa/service-worker-register.tsx")).toBe(
      false,
    );
    expect(layout).not.toMatch(/navigator\.serviceWorker/);
    expect(layout).not.toContain("ServiceWorkerRegister");
    expect(nextConfig).not.toContain("Service-Worker-Allowed");
    expect(nextConfig).not.toContain("/sw.js");
  });

  it("keeps email confirmation as an explicit POST on the GET landing", () => {
    const confirmPage = readFileSync(
      "src/app/(marketing)/auth/confirm/page.tsx",
      "utf8",
    );
    expect(confirmPage).toContain("confirmEmailAction");
    expect(confirmPage).toContain('method="post"');
    expect(confirmPage).toContain(
      "Opening this page does not confirm the account",
    );
    expect(confirmPage).not.toContain("consumeEmailConfirmation(");
  });
});

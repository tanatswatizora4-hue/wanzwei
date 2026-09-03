import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("mobile authenticated shell", () => {
  it("uses a client AppShell with a mobile drawer that stays closed by default", () => {
    const layout = readFileSync("src/app/(app)/layout.tsx", "utf8");
    const shell = readFileSync("src/components/app/app-shell.tsx", "utf8");
    const topbar = readFileSync("src/components/app/topbar.tsx", "utf8");
    const sidebar = readFileSync("src/components/app/sidebar.tsx", "utf8");

    expect(layout).toContain("AppShell");
    expect(layout).toContain("overflow-x-hidden");
    expect(layout).not.toMatch(/<Sidebar\s+user=\{user\}\s*\/>/);

    expect(shell).toContain("useState(false)");
    expect(shell).toContain("-translate-x-full");
    expect(shell).toContain("lg:static");
    expect(shell).toContain("lg:translate-x-0");
    expect(shell).toContain("onNavigate={closeMobileNav}");
    expect(shell).toContain("onOpenMobileNav={openMobileNav}");
    expect(shell).toContain("aria-label=\"Close navigation\"");

    expect(topbar).toContain("onOpenMobileNav");
    expect(topbar).toContain("lg:hidden");
    expect(topbar).toContain('aria-label="Open navigation"');
    expect(topbar).toContain("Log out");
    expect(topbar).toContain("Profile");
    expect(topbar).toContain("Settings");

    expect(sidebar).toContain("onNavigate");
    expect(sidebar).toContain("href: \"/professional/cpd\"");
    expect(sidebar).toContain("href: \"/facility/marketplace\"");
    expect(sidebar).toContain("href: \"/admin/cpd\"");
  });

  it("keeps dense tables and dialogs inside the viewport on narrow screens", () => {
    const table = readFileSync("src/components/ui/table.tsx", "utf8");
    const dialog = readFileSync("src/components/ui/dialog.tsx", "utf8");
    const root = readFileSync("src/app/layout.tsx", "utf8");

    expect(table).toContain("overflow-x-auto");
    expect(table).toContain("overscroll-x-contain");
    expect(table).toContain("min-w-max");
    expect(dialog).toContain("w-[calc(100%-2rem)]");
    expect(dialog).toContain("max-h-[calc(100dvh-2rem)]");
    expect(root).toContain("overflow-x-hidden");
    expect(root).toContain("device-width");
    expect(root).not.toContain("appleWebApp");
    expect(root).not.toContain("manifest:");
  });
});

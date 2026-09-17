import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("multi-profile architecture", () => {
  it("does not switch profiles by rewriting public.users.role", () => {
    const switcher = readFileSync("src/app/(app)/workspace/actions.ts", "utf8");
    const switchFn = switcher.slice(
      switcher.indexOf("export async function switchWorkspaceAction"),
      switcher.indexOf("export async function createFacilityWorkspaceAction"),
    );
    expect(switchFn).toContain("persistWorkspacePreference");
    expect(switchFn).not.toContain("updateUser(");
    expect(switchFn).toContain("Admin is a system privilege");
  });

  it("does not trust client facility ids as authorization", () => {
    const create = readFileSync("src/app/(app)/marketplace/actions.ts", "utf8");
    expect(create).toContain("listingContext");
    expect(create).not.toContain("formData.get(\"facilityId\")");
    expect(create).not.toContain("formData.get(\"seller_id\")");
    expect(create).toContain("requireFacilityCapability");
  });

  it("keeps Google OAuth, email login, confirmation, and password reset routes", () => {
    expect(readFileSync("src/app/api/auth/google/route.ts", "utf8")).toContain(
      "/auth/callback",
    );
    expect(readFileSync("src/app/auth/callback/route.ts", "utf8")).toContain(
      "exchangeCodeForSession",
    );
    expect(readFileSync("src/app/api/auth/login/route.ts", "utf8")).toContain(
      "authorizedPostAuthPathForAccount",
    );
    expect(
      readFileSync("src/app/(marketing)/auth/confirm/actions.ts", "utf8"),
    ).toContain("verifyOtp");
    expect(readFileSync("src/lib/auth/email.ts", "utf8")).toContain(
      "resetPasswordForEmail",
    );
  });

  it("membership writes are not granted to ordinary clients", () => {
    const migration = readFileSync(
      "supabase/migrations/0014_account_memberships.sql",
      "utf8",
    );
    expect(migration).toContain("account_memberships_no_client_insert");
    expect(migration).toContain("with check (false)");
    expect(migration).toContain("role = 'professional'");
    expect(migration).toContain("role = 'facility'");
    expect(migration).toContain("u.facility_id is not null");
  });

  it("does not resolve facility access from email on product pages", () => {
    for (const file of [
      "src/app/(app)/facility/dashboard/page.tsx",
      "src/app/(app)/facility/jobs/page.tsx",
      "src/app/(app)/facility/applications/page.tsx",
      "src/app/(app)/facility/emergency/page.tsx",
      "src/app/(app)/facility/profile/page.tsx",
      "src/app/(app)/facility/settings/page.tsx",
      "src/app/(app)/facility/network/page.tsx",
      "src/app/(app)/facility/broadcasts/page.tsx",
    ]) {
      expect(readFileSync(file, "utf8"), file).toMatch(
        /resolveFacilityForUser|getActiveFacilityContext/,
      );
      expect(readFileSync(file, "utf8"), file).not.toContain(
        "findFacilityForUserEmail",
      );
    }
  });
});

import { describe, expect, it } from "vitest";

import { applyOwnProfileUpdate } from "./update-own-profile";
import type { Facility, User } from "@/lib/types";

const PRO = makeUser({
  id: "11111111-1111-4111-8111-111111111111",
  email: "pro@example.com",
  role: "professional",
  name: "Tinashe Moyo",
  location: "Harare",
  verified: false,
  profession: "Nurse",
  registeringBody: "Nurses Council of Zimbabwe",
  registrationNumber: "N12345",
});

const FACILITY_USER = makeUser({
  id: "22222222-2222-4222-8222-222222222222",
  email: "facility@example.com",
  role: "facility",
  name: "Chipo Ncube",
  location: "Harare",
  facilityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  verified: false,
});

function makeUser(overrides: Partial<User>): User {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "user@example.com",
    role: "professional",
    name: "User",
    verified: false,
    ...overrides,
  };
}

function form(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("applyOwnProfileUpdate", () => {
  it("lets a professional update name and location only", async () => {
    const patches: Array<{ name: string; location?: string | null }> = [];
    const result = await applyOwnProfileUpdate(
      PRO,
      form({ name: "Tinashe Updated", location: "Bulawayo" }),
      {
        hasDbConfig: () => true,
        updateOwnUserProfile: async (userId, patch) => {
          expect(userId).toBe(PRO.id);
          patches.push(patch);
          return { ...PRO, name: patch.name, location: patch.location ?? undefined };
        },
        updateFacilityPublicProfile: async () => {
          throw new Error("professionals must not update facilities");
        },
      },
    );

    expect(result).toEqual({ ok: true });
    expect(patches).toEqual([{ name: "Tinashe Updated", location: "Bulawayo" }]);
  });

  it("lets a facility update contact and facility public profile fields", async () => {
    const userPatches: unknown[] = [];
    const facilityPatches: unknown[] = [];
    const result = await applyOwnProfileUpdate(
      FACILITY_USER,
      form({
        name: "Chipo Updated",
        location: "Mutare",
        organisationName: "Mutare Clinic",
        facilityLocation: "Mutare",
        facilityType: "Clinic",
      }),
      {
        hasDbConfig: () => true,
        updateOwnUserProfile: async (_userId, patch) => {
          userPatches.push(patch);
          return {
            ...FACILITY_USER,
            name: patch.name,
            location: patch.location ?? undefined,
          };
        },
        updateFacilityPublicProfile: async (facilityId, patch) => {
          expect(facilityId).toBe(FACILITY_USER.facilityId);
          facilityPatches.push(patch);
          return {
            id: facilityId,
            name: patch.name ?? "Mutare Clinic",
            type: patch.type ?? "Clinic",
            location: patch.location ?? "Mutare",
            verified: false,
            rating: 0,
            openRoles: 0,
            logoColor: "from-slate-400 to-slate-600",
            initials: "MC",
          } satisfies Facility;
        },
      },
    );

    expect(result).toEqual({ ok: true });
    expect(userPatches).toEqual([{ name: "Chipo Updated", location: "Mutare" }]);
    expect(facilityPatches).toEqual([
      {
        name: "Mutare Clinic",
        location: "Mutare",
        type: "Clinic",
      },
    ]);
    expect(JSON.stringify(facilityPatches)).not.toContain("verified");
    expect(JSON.stringify(userPatches)).not.toContain("role");
    expect(JSON.stringify(userPatches)).not.toContain("facilityId");
  });

  it("rejects protected fields even when mixed with valid updates", async () => {
    let wrote = false;
    const result = await applyOwnProfileUpdate(
      PRO,
      form({
        name: "Tinashe Updated",
        role: "admin",
        verified: "true",
        facilityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        registrationNumber: "HACK",
        registeringBody: "HACK",
        profession: "Doctor",
      }),
      {
        hasDbConfig: () => true,
        updateOwnUserProfile: async () => {
          wrote = true;
          return PRO;
        },
        updateFacilityPublicProfile: async () => {
          wrote = true;
          return null;
        },
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/cannot be changed/i);
    }
    expect(wrote).toBe(false);
  });

  it("does not let a facility user choose another facility_id", async () => {
    let facilityIdWritten: string | null = null;
    const result = await applyOwnProfileUpdate(
      FACILITY_USER,
      form({
        name: "Chipo Ncube",
        organisationName: "Cure Hospital",
        facilityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
      {
        hasDbConfig: () => true,
        updateOwnUserProfile: async () => {
          throw new Error("should not write after tamper");
        },
        updateFacilityPublicProfile: async (facilityId) => {
          facilityIdWritten = facilityId;
          return null;
        },
      },
    );

    expect(result.ok).toBe(false);
    expect(facilityIdWritten).toBeNull();
  });
});

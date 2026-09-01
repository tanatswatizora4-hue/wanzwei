import { describe, expect, it } from "vitest";

import {
  completeEmailSignup,
  ensureAppUserProfile,
  isUniqueViolation,
  type AppUserStore,
  type EmailSignupDeps,
} from "./provision-app-user";
import type { NewDbUser } from "@/lib/db/schema";
import type { User } from "@/lib/types";
import type { ExistingAuthUser } from "@/lib/supabase/admin";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "pro@example.com",
    role: "professional",
    name: "Tinashe Moyo",
    verified: false,
    ...overrides,
  };
}

function memoryStore(seed: User[] = []): AppUserStore & {
  rows: User[];
  facilities: { id: string; verified: boolean }[];
} {
  const rows = [...seed];
  const facilities: { id: string; verified: boolean }[] = [];
  return {
    rows,
    facilities,
    hasDbConfig: () => true,
    findUserByEmail: async (email) =>
      rows.find((row) => row.email.toLowerCase() === email.toLowerCase()) ??
      null,
    createUser: async (user: NewDbUser) => {
      const created = makeUser({
        id: user.id ?? "generated-id",
        email: user.email,
        name: user.name,
        role: user.role,
        verified: user.verified === true,
        facilityId: user.facilityId ?? undefined,
      });
      rows.push(created);
      return created;
    },
    provisionFacilityUser: async (input) => {
      const facilityId = `fac-${input.userId}`;
      const created = makeUser({
        id: input.userId,
        email: input.email,
        name: input.contactName,
        role: "facility",
        verified: false,
        facilityId,
        location: input.location,
      });
      rows.push(created);
      facilities.push({ id: facilityId, verified: false });
      return { userId: input.userId, facilityId, verified: false };
    },
    attachFacilityToExistingUser: async (input) => {
      const user = rows.find((row) => row.id === input.userId);
      if (!user || user.role !== "facility") return null;
      if (user.facilityId) {
        return { facilityId: user.facilityId, verified: false };
      }
      const facilityId = `fac-${input.userId}`;
      user.facilityId = facilityId;
      user.location = input.location;
      facilities.push({ id: facilityId, verified: false });
      return { facilityId, verified: false };
    },
  };
}

function signupDeps(
  store: AppUserStore,
  overrides: Partial<EmailSignupDeps> = {},
): EmailSignupDeps {
  return {
    ...store,
    createAuthUserWithRole: async () => ({
      userId: "11111111-1111-4111-8111-111111111111",
    }),
    deleteAuthUser: async () => true,
    findAuthUserByEmail: async () => null,
    ...overrides,
  };
}

describe("isUniqueViolation", () => {
  it("matches Postgres unique_violation codes, including wrapped causes", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("duplicate"))).toBe(false);
  });
});

describe("ensureAppUserProfile", () => {
  it("creates public.users with the Auth user id and requested role", async () => {
    const store = memoryStore();
    const profile = await ensureAppUserProfile(
      {
        authUserId: "11111111-1111-4111-8111-111111111111",
        email: "pro@example.com",
        name: "Tinashe Moyo",
        role: "professional",
      },
      store,
    );

    expect(profile).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      email: "pro@example.com",
      role: "professional",
      name: "Tinashe Moyo",
      verified: false,
    });
    expect(store.rows).toHaveLength(1);
  });

  it("stores a normalized email so mixed case cannot split identities", async () => {
    const store = memoryStore();
    const profile = await ensureAppUserProfile(
      {
        authUserId: "11111111-1111-4111-8111-111111111111",
        email: "Pro@Example.com",
        name: "Tinashe Moyo",
        role: "professional",
      },
      store,
    );

    expect(profile.email).toBe("pro@example.com");
    await expect(
      ensureAppUserProfile(
        {
          authUserId: "22222222-2222-4222-8222-222222222222",
          email: "PRO@example.com",
          name: "Someone Else",
          role: "professional",
        },
        store,
      ),
    ).rejects.toMatchObject({ code: "email_taken" });
  });

  it("reuses an existing profile when the Auth id already matches", async () => {
    const existing = makeUser();
    const store = memoryStore([existing]);
    let created = 0;
    store.createUser = async () => {
      created += 1;
      return makeUser();
    };

    const profile = await ensureAppUserProfile(
      {
        authUserId: existing.id,
        email: existing.email,
        name: "Someone Else",
        role: "facility",
      },
      store,
    );

    expect(profile).toEqual(existing);
    expect(created).toBe(0);
  });

  it("rejects an email that already belongs to a different user id", async () => {
    const store = memoryStore([makeUser({ id: "other-user" })]);

    await expect(
      ensureAppUserProfile(
        {
          authUserId: "11111111-1111-4111-8111-111111111111",
          email: "pro@example.com",
          name: "Tinashe Moyo",
          role: "professional",
        },
        store,
      ),
    ).rejects.toMatchObject({
      name: "AppUserProvisionError",
      code: "email_taken",
    });
  });

  it("fails closed when the database is not configured", async () => {
    await expect(
      ensureAppUserProfile(
        {
          authUserId: "11111111-1111-4111-8111-111111111111",
          email: "pro@example.com",
          name: "Tinashe Moyo",
          role: "professional",
        },
        {
          hasDbConfig: () => false,
          findUserByEmail: async () => {
            throw new Error("should not query");
          },
          createUser: async () => {
            throw new Error("should not insert");
          },
        },
      ),
    ).rejects.toMatchObject({ code: "db_not_configured" });
  });

  it("treats a unique violation for the same Auth id as success", async () => {
    const existing = makeUser();
    let lookups = 0;
    const store: AppUserStore = {
      hasDbConfig: () => true,
      findUserByEmail: async () => {
        lookups += 1;
        return lookups === 1 ? null : existing;
      },
      createUser: async () => {
        throw Object.assign(new Error("duplicate key"), { code: "23505" });
      },
    };

    await expect(
      ensureAppUserProfile(
        {
          authUserId: existing.id,
          email: existing.email,
          name: existing.name,
          role: existing.role,
        },
        store,
      ),
    ).resolves.toEqual(existing);
  });

  it("treats a unique violation for a different id as email taken", async () => {
    let lookups = 0;
    const store: AppUserStore = {
      hasDbConfig: () => true,
      findUserByEmail: async () => {
        lookups += 1;
        return lookups === 1 ? null : makeUser({ id: "other-user" });
      },
      createUser: async () => {
        throw Object.assign(new Error("duplicate key"), { code: "23505" });
      },
    };

    await expect(
      ensureAppUserProfile(
        {
          authUserId: "11111111-1111-4111-8111-111111111111",
          email: "pro@example.com",
          name: "Tinashe Moyo",
          role: "professional",
        },
        store,
      ),
    ).rejects.toMatchObject({ code: "email_taken" });
  });
});

describe("completeEmailSignup", () => {
  const input = {
    email: "pro@example.com",
    password: "secret1",
    name: "Tinashe Moyo",
    role: "professional" as const,
  };

  it("creates Auth then a public.users row with the same id, unverified", async () => {
    const store = memoryStore();
    const authIds: string[] = [];
    const result = await completeEmailSignup(
      input,
      signupDeps(store, {
        createAuthUserWithRole: async ({ role, email, name }) => {
          expect(role).toBe("professional");
          expect(email).toBe(input.email);
          expect(name).toBe(input.name);
          authIds.push("11111111-1111-4111-8111-111111111111");
          return { userId: "11111111-1111-4111-8111-111111111111" };
        },
      }),
    );

    expect(result).toEqual({
      ok: true,
      userId: "11111111-1111-4111-8111-111111111111",
      recovered: false,
      emailConfirmed: false,
    });
    expect(store.rows[0]).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      email: "pro@example.com",
      role: "professional",
      verified: false,
    });
    expect(authIds).toHaveLength(1);
  });

  it("preserves the facility role on the profile row", async () => {
    const store = memoryStore();
    const result = await completeEmailSignup(
      {
        ...input,
        role: "facility",
        facility: {
          organisationName: "Cure Hospital",
          location: "Harare",
          facilityType: "Hospital",
        },
      },
      signupDeps(store),
    );

    expect(result.ok).toBe(true);
    expect(store.rows[0]?.role).toBe("facility");
    expect(store.rows[0]?.verified).toBe(false);
    expect(store.rows[0]?.facilityId).toBeTruthy();
  });

  it("returns exists without creating Auth when the email is already profiled", async () => {
    const store = memoryStore([makeUser({ id: "seeded-user" })]);
    let authCreated = 0;
    const result = await completeEmailSignup(
      input,
      signupDeps(store, {
        createAuthUserWithRole: async () => {
          authCreated += 1;
          return { userId: "new-auth-id" };
        },
      }),
    );

    expect(result).toMatchObject({ ok: false, code: "exists" });
    expect(authCreated).toBe(0);
  });

  it("treats mixed-case repeats of a profiled email as exists", async () => {
    const store = memoryStore([makeUser({ email: "pro@example.com" })]);
    let authCreated = 0;
    const result = await completeEmailSignup(
      { ...input, email: "Pro@Example.com" },
      signupDeps(store, {
        createAuthUserWithRole: async () => {
          authCreated += 1;
          return { userId: "new-auth-id" };
        },
      }),
    );

    expect(result).toMatchObject({ ok: false, code: "exists" });
    expect(authCreated).toBe(0);
  });

  it("does not treat a schema-missing Auth error as exists", async () => {
    const store = memoryStore();
    const result = await completeEmailSignup(
      input,
      signupDeps(store, {
        createAuthUserWithRole: async () => {
          throw new Error('relation "auth.users" does not exist');
        },
      }),
    );

    expect(result).toMatchObject({ ok: false, code: "create_user_failed" });
    expect(store.rows).toHaveLength(0);
  });

  it("completes a legacy Auth-without-profile user onto the same UUID", async () => {
    const store = memoryStore();
    let authCreated = 0;
    const existingAuth: ExistingAuthUser = {
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      email: "pro@example.com",
      role: "professional",
      name: "Legacy Name",
      emailConfirmed: false,
    };
    const result = await completeEmailSignup(
      input,
      signupDeps(store, {
        createAuthUserWithRole: async () => {
          authCreated += 1;
          throw Object.assign(new Error("User already registered"), {
            code: "email_exists",
          });
        },
        findAuthUserByEmail: async () => existingAuth,
      }),
    );

    expect(authCreated).toBe(1);
    expect(result).toEqual({
      ok: true,
      userId: existingAuth.userId,
      recovered: true,
      emailConfirmed: false,
    });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({
      id: existingAuth.userId,
      email: "pro@example.com",
      role: "professional",
      name: "Legacy Name",
      verified: false,
    });
  });

  it("does not mint admin or invent a profile when the Auth role is not public", async () => {
    const store = memoryStore();
    const result = await completeEmailSignup(
      input,
      signupDeps(store, {
        createAuthUserWithRole: async () => {
          throw new Error("User already registered");
        },
        findAuthUserByEmail: async () => ({
          userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          email: "pro@example.com",
          role: "admin",
          name: "Platform Admin",
          emailConfirmed: true,
        }),
      }),
    );

    expect(result).toMatchObject({ ok: false, code: "incomplete_signup" });
    expect(store.rows).toHaveLength(0);
  });

  it("returns incomplete_signup when Auth is duplicate but cannot be loaded safely", async () => {
    const store = memoryStore();
    const result = await completeEmailSignup(
      input,
      signupDeps(store, {
        createAuthUserWithRole: async () => {
          throw new Error("User already registered");
        },
        findAuthUserByEmail: async () => null,
      }),
    );

    expect(result).toMatchObject({ ok: false, code: "incomplete_signup" });
    expect(store.rows).toHaveLength(0);
  });

  it("keeps email_taken when recovering would overwrite another profile", async () => {
    const store = memoryStore([makeUser({ id: "other-user" })]);
    let lookups = 0;
    store.findUserByEmail = async () => {
      lookups += 1;
      return lookups === 1 ? null : makeUser({ id: "other-user" });
    };

    const result = await completeEmailSignup(
      input,
      signupDeps(store, {
        createAuthUserWithRole: async () => {
          throw new Error("User already registered");
        },
        findAuthUserByEmail: async () => ({
          userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          email: "pro@example.com",
          role: "professional",
          name: "Legacy Name",
          emailConfirmed: false,
        }),
      }),
    );

    expect(result).toMatchObject({ ok: false, code: "exists" });
  });

  it("rolls back the Auth user when profile creation fails", async () => {
    const deleted: string[] = [];
    const store = memoryStore();
    store.createUser = async () => {
      throw new Error("insert failed");
    };

    const result = await completeEmailSignup(
      input,
      signupDeps(store, {
        deleteAuthUser: async (userId) => {
          deleted.push(userId);
          return true;
        },
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "profile_create_failed",
      message: "insert failed",
    });
    expect(deleted).toEqual(["11111111-1111-4111-8111-111111111111"]);
  });

  it("does not claim success when Auth rollback also fails", async () => {
    const store = memoryStore();
    store.createUser = async () => {
      throw new Error("insert failed");
    };

    const result = await completeEmailSignup(
      input,
      signupDeps(store, {
        deleteAuthUser: async () => false,
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "profile_create_failed",
    });
  });

  it("rolls back Auth and returns exists when a raced profile has a different id", async () => {
    const deleted: string[] = [];
    let lookups = 0;
    const result = await completeEmailSignup(input, {
      hasDbConfig: () => true,
      findUserByEmail: async () => {
        lookups += 1;
        return lookups < 3 ? null : makeUser({ id: "other-user" });
      },
      createUser: async () => {
        throw Object.assign(new Error("duplicate key"), { code: "23505" });
      },
      createAuthUserWithRole: async () => ({
        userId: "11111111-1111-4111-8111-111111111111",
      }),
      deleteAuthUser: async (userId) => {
        deleted.push(userId);
        return true;
      },
      findAuthUserByEmail: async () => null,
    });

    expect(result).toMatchObject({ ok: false, code: "exists" });
    expect(deleted).toEqual(["11111111-1111-4111-8111-111111111111"]);
  });

  it("does not create an Auth user when the database is not configured", async () => {
    let authCreated = 0;
    const result = await completeEmailSignup(input, {
      hasDbConfig: () => false,
      findUserByEmail: async () => null,
      createUser: async () => {
        throw new Error("should not insert");
      },
      createAuthUserWithRole: async () => {
        authCreated += 1;
        return { userId: "should-not-run" };
      },
      deleteAuthUser: async () => true,
      findAuthUserByEmail: async () => null,
    });

    expect(result).toMatchObject({ ok: false, code: "db_not_configured" });
    expect(authCreated).toBe(0);
  });
});

const FACILITY_SIGNUP = {
  organisationName: "Cure Hospital",
  location: "Harare",
  facilityType: "Hospital" as const,
};

describe("facility signup provisioning", () => {
  it("creates an unverified facility and links users.facility_id", async () => {
    const store = memoryStore();
    const result = await completeEmailSignup(
      {
        email: "facility@example.com",
        password: "secret1",
        name: "Chipo Ncube",
        role: "facility",
        facility: FACILITY_SIGNUP,
      },
      signupDeps(store, {
        createAuthUserWithRole: async ({ role }) => {
          expect(role).toBe("facility");
          return { userId: "11111111-1111-4111-8111-111111111111" };
        },
      }),
    );

    expect(result.ok).toBe(true);
    expect(store.rows[0]).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      email: "facility@example.com",
      role: "facility",
      verified: false,
      facilityId: "fac-11111111-1111-4111-8111-111111111111",
    });
    expect(store.facilities).toEqual([
      { id: "fac-11111111-1111-4111-8111-111111111111", verified: false },
    ]);
  });

  it("does not mint verified or admin during facility signup", async () => {
    const store = memoryStore();
    await completeEmailSignup(
      {
        email: "facility@example.com",
        password: "secret1",
        name: "Chipo Ncube",
        role: "facility",
        facility: FACILITY_SIGNUP,
      },
      signupDeps(store),
    );

    expect(store.rows[0]?.role).toBe("facility");
    expect(store.rows[0]?.role).not.toBe("admin");
    expect(store.rows[0]?.verified).toBe(false);
    expect(store.facilities[0]?.verified).toBe(false);
  });

  it("fails closed when facility details are missing", async () => {
    const store = memoryStore();
    const deleted: string[] = [];
    const result = await completeEmailSignup(
      {
        email: "facility@example.com",
        password: "secret1",
        name: "Chipo Ncube",
        role: "facility",
      },
      signupDeps(store, {
        deleteAuthUser: async (userId) => {
          deleted.push(userId);
          return true;
        },
      }),
    );

    expect(result).toMatchObject({ ok: false, code: "facility_create_failed" });
    expect(store.rows).toHaveLength(0);
    expect(deleted).toEqual(["11111111-1111-4111-8111-111111111111"]);
  });

  it("does not present a verified facility if provisioning tries to mint verified", async () => {
    const store = memoryStore();
    store.provisionFacilityUser = async () => ({
      userId: "11111111-1111-4111-8111-111111111111",
      facilityId: "should-not-count",
      verified: true,
    });
    const deleted: string[] = [];
    const result = await completeEmailSignup(
      {
        email: "facility@example.com",
        password: "secret1",
        name: "Chipo Ncube",
        role: "facility",
        facility: FACILITY_SIGNUP,
      },
      signupDeps(store, {
        deleteAuthUser: async (userId) => {
          deleted.push(userId);
          return true;
        },
      }),
    );

    expect(result).toMatchObject({ ok: false, code: "facility_create_failed" });
    expect(deleted).toHaveLength(1);
  });

  it("leaves an already-linked seeded facility account unchanged", async () => {
    const existing = makeUser({
      id: "11111111-1111-4111-8111-111111111111",
      email: "facility@example.com",
      role: "facility",
      facilityId: "seeded-facility",
      verified: false,
    });
    const store = memoryStore([existing]);
    let attached = 0;
    store.attachFacilityToExistingUser = async () => {
      attached += 1;
      return { facilityId: "new-facility", verified: false };
    };

    const profile = await ensureAppUserProfile(
      {
        authUserId: existing.id,
        email: existing.email,
        name: existing.name,
        role: "facility",
        facility: FACILITY_SIGNUP,
      },
      store,
    );

    expect(profile.facilityId).toBe("seeded-facility");
    expect(attached).toBe(0);
    expect(store.facilities).toHaveLength(0);
  });

  it("attaches a facility to a legacy facility profile that is missing facility_id", async () => {
    const existing = makeUser({
      id: "11111111-1111-4111-8111-111111111111",
      email: "facility@example.com",
      role: "facility",
      verified: false,
    });
    const store = memoryStore([existing]);

    const profile = await ensureAppUserProfile(
      {
        authUserId: existing.id,
        email: existing.email,
        name: existing.name,
        role: "facility",
        facility: FACILITY_SIGNUP,
      },
      store,
    );

    expect(profile.role).toBe("facility");
    expect(profile.facilityId).toBe("fac-11111111-1111-4111-8111-111111111111");
    expect(profile.verified).toBe(false);
  });

  it("does not create a facility during professional signup", async () => {
    const store = memoryStore();
    let provisioned = 0;
    store.provisionFacilityUser = async () => {
      provisioned += 1;
      return null;
    };

    const result = await completeEmailSignup(
      {
        email: "pro@example.com",
        password: "secret1",
        name: "Tinashe Moyo",
        role: "professional",
      },
      signupDeps(store),
    );

    expect(result.ok).toBe(true);
    expect(provisioned).toBe(0);
    expect(store.rows[0]?.role).toBe("professional");
    expect(store.rows[0]?.facilityId).toBeUndefined();
  });
});

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

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "pro@example.com",
    role: "professional",
    name: "Tinashe Moyo",
    ...overrides,
  };
}

function memoryStore(seed: User[] = []): AppUserStore & { rows: User[] } {
  const rows = [...seed];
  return {
    rows,
    hasDbConfig: () => true,
    findUserByEmail: async (email) =>
      rows.find((row) => row.email === email) ?? null,
    createUser: async (user: NewDbUser) => {
      const created = makeUser({
        id: user.id ?? "generated-id",
        email: user.email,
        name: user.name,
        role: user.role,
      });
      rows.push(created);
      return created;
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
    deleteAuthUser: async () => undefined,
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
        role: "facility",
      },
      store,
    );

    expect(profile).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      email: "pro@example.com",
      role: "facility",
      name: "Tinashe Moyo",
    });
    expect(store.rows).toHaveLength(1);
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

  it("creates Auth then a public.users row with the same id", async () => {
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
    });
    expect(store.rows[0]).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      email: "pro@example.com",
      role: "professional",
    });
    expect(authIds).toHaveLength(1);
  });

  it("preserves the facility role on the profile row", async () => {
    const store = memoryStore();
    const result = await completeEmailSignup(
      { ...input, role: "facility" },
      signupDeps(store),
    );

    expect(result.ok).toBe(true);
    expect(store.rows[0]?.role).toBe("facility");
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

  it("maps an already-registered Auth error to exists", async () => {
    const store = memoryStore();
    const result = await completeEmailSignup(
      input,
      signupDeps(store, {
        createAuthUserWithRole: async () => {
          throw new Error("User already registered");
        },
      }),
    );

    expect(result).toMatchObject({ ok: false, code: "exists" });
    expect(store.rows).toHaveLength(0);
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

  it("rolls back Auth and returns exists when a raced profile has a different id", async () => {
    const deleted: string[] = [];
    let lookups = 0;
    const result = await completeEmailSignup(input, {
      hasDbConfig: () => true,
      findUserByEmail: async () => {
        lookups += 1;
        // 1: completeEmailSignup pre-check
        // 2: ensureAppUserProfile pre-insert check
        // 3: unique-violation re-read
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
      },
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
      deleteAuthUser: async () => undefined,
    });

    expect(result).toMatchObject({ ok: false, code: "db_not_configured" });
    expect(authCreated).toBe(0);
  });
});

import { describe, expect, it } from "vitest";

import {
  completeLoginAfterAuth,
  type CompleteLoginOptions,
} from "./complete-login";
import type { AppUserStore } from "./provision-app-user";
import type { NewDbUser } from "@/lib/db/schema";
import type { User } from "@/lib/types";

const AUTH_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: AUTH_ID,
    email: "pro@example.com",
    role: "professional",
    name: "Tinashe Moyo",
    verified: false,
    ...overrides,
  };
}

function authUser(
  overrides: {
    id?: string;
    email?: string | undefined;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  } = {},
) {
  return {
    id: overrides.id ?? AUTH_ID,
    email: "email" in overrides ? overrides.email : "pro@example.com",
    app_metadata: overrides.app_metadata ?? { role: "professional" },
    user_metadata: overrides.user_metadata ?? { full_name: "Tinashe Moyo" },
  };
}

function memoryStore(seed: User[] = []): AppUserStore & {
  rows: User[];
  created: NewDbUser[];
} {
  const rows = [...seed];
  const created: NewDbUser[] = [];
  return {
    rows,
    created,
    hasDbConfig: () => true,
    findUserByEmail: async (email) =>
      rows.find((row) => row.email.toLowerCase() === email.toLowerCase()) ??
      null,
    createUser: async (user: NewDbUser) => {
      created.push(user);
      const profile = makeUser({
        id: user.id ?? AUTH_ID,
        email: user.email,
        name: user.name,
        role: user.role,
        verified: user.verified === true,
      });
      rows.push(profile);
      return profile;
    },
  };
}

function login(
  user: ReturnType<typeof authUser>,
  store: AppUserStore,
  options: CompleteLoginOptions = {},
) {
  return completeLoginAfterAuth(user, store, {
    isClosedAccount: async () => false,
    ...options,
  });
}

describe("completeLoginAfterAuth", () => {
  it("continues login when a matching public.users profile already exists", async () => {
    const existing = makeUser();
    const store = memoryStore([existing]);
    const result = await login(authUser(), store);

    expect(result).toEqual({
      ok: true,
      role: "professional",
      profile: existing,
      repaired: false,
    });
    expect(store.created).toHaveLength(0);
  });

  it("does not recreate a profile for a closed account", async () => {
    const store = memoryStore();
    const result = await login(authUser(), store, {
      isClosedAccount: async () => true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("account_closed");
    }
    expect(store.created).toHaveLength(0);
  });

  it("matches an existing profile when the Auth email differs only by case", async () => {
    const existing = makeUser({ email: "Pro@Example.com" });
    const store = memoryStore([existing]);
    const result = await login(authUser(), store);

    expect(result).toEqual({
      ok: true,
      role: "professional",
      profile: existing,
      repaired: false,
    });
    expect(store.created).toHaveLength(0);
  });

  it("repairs an orphan Auth user by creating public.users with the Auth UUID", async () => {
    const store = memoryStore();
    const result = await login(
      authUser({
        app_metadata: { role: "professional" },
        user_metadata: { full_name: "Tinashe Moyo", role: "admin" },
      }),
      store,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.repaired).toBe(true);
    expect(result.role).toBe("professional");
    expect(result.profile).toMatchObject({
      id: AUTH_ID,
      email: "pro@example.com",
      role: "professional",
      name: "Tinashe Moyo",
      verified: false,
    });
    expect(store.created).toEqual([
      expect.objectContaining({
        id: AUTH_ID,
        role: "professional",
        name: "Tinashe Moyo",
        verified: false,
      }),
    ]);
  });

  it("does not create an unlinked facility profile on login without organisation details", async () => {
    const store = memoryStore();
    const result = await login(
      authUser({
        app_metadata: { role: "facility" },
        user_metadata: { full_name: "Chipo Ncube" },
      }),
      store,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("profile_unavailable");
    expect(store.created).toHaveLength(0);
    expect(store.rows).toHaveLength(0);
  });

  it("rejects a missing or invalid app_metadata role without creating a profile", async () => {
    const store = memoryStore();
    const missing = await login(
      authUser({
        app_metadata: {},
        user_metadata: { role: "admin" },
      }),
      store,
    );
    const invalid = await login(
      authUser({ app_metadata: { role: "owner" } }),
      store,
    );

    expect(missing).toEqual({
      ok: false,
      code: "no_role",
      logReason: "missing_role",
    });
    expect(invalid).toEqual({
      ok: false,
      code: "no_role",
      logReason: "missing_role",
    });
    expect(store.created).toHaveLength(0);
    expect(store.rows).toHaveLength(0);
  });

  it("rejects an email that already belongs to a different Auth UUID", async () => {
    const store = memoryStore([makeUser({ id: OTHER_ID })]);
    const result = await login(authUser(), store);

    expect(result).toEqual({
      ok: false,
      code: "profile_unavailable",
      logReason: "email_taken",
      logDetail: "An account with that email already exists.",
    });
    expect(store.created).toHaveLength(0);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]?.id).toBe(OTHER_ID);
  });

  it("returns a generic failure code when profile creation fails", async () => {
    const store = memoryStore();
    store.createUser = async () => {
      throw new Error("insert failed: relation public.users does not exist");
    };

    const result = await login(authUser(), store);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("profile_unavailable");
    expect(result.logReason).toBe("profile_create_failed");
    expect(result.logDetail).toContain("insert failed");
    expect(JSON.stringify(result)).not.toMatch(/npm run|db:push|auth:bootstrap/i);
  });

  it("does not attempt repair when the database is not configured", async () => {
    let queried = 0;
    const result = await login(authUser(), {
      hasDbConfig: () => false,
      findUserByEmail: async () => {
        queried += 1;
        return null;
      },
      createUser: async () => {
        throw new Error("should not insert");
      },
    });

    expect(result).toEqual({
      ok: false,
      code: "db_not_configured",
      logReason: "db_not_configured",
    });
    expect(queried).toBe(0);
  });

  it("falls back through full_name, name, then email local-part", async () => {
    const fullNameStore = memoryStore();
    await login(
      authUser({
        user_metadata: { full_name: "  Alois Muchamba  ", name: "Ignored" },
      }),
      fullNameStore,
    );
    expect(fullNameStore.created[0]?.name).toBe("Alois Muchamba");

    const nameStore = memoryStore();
    await login(
      authUser({ user_metadata: { name: "Chipo Ncube" } }),
      nameStore,
    );
    expect(nameStore.created[0]?.name).toBe("Chipo Ncube");

    const localStore = memoryStore();
    await login(
      authUser({
        email: "locum.lead@hospital.co.zw",
        user_metadata: {},
      }),
      localStore,
    );
    expect(localStore.created[0]?.name).toBe("locum.lead");
  });

  it("first Google login defaults to professional, verified false, and ignores user_metadata.role", async () => {
    const store = memoryStore();
    const persisted: Array<{ userId: string; role: string }> = [];
    const result = await login(
      authUser({
        app_metadata: {},
        user_metadata: { role: "admin", full_name: "Tinashe Moyo" },
      }),
      store,
      {
        missingRoleBehavior: "default_professional",
        persistAppRole: async (userId, role) => {
          persisted.push({ userId, role });
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.repaired).toBe(true);
    expect(result.role).toBe("professional");
    expect(result.profile.verified).toBe(false);
    expect(persisted).toEqual([{ userId: AUTH_ID, role: "professional" }]);
    expect(store.created[0]).toMatchObject({
      role: "professional",
      verified: false,
    });
  });

  it("returning Google user keeps an existing facility profile and does not overwrite role", async () => {
    const existing = makeUser({ role: "facility", name: "Clinic Admin" });
    const store = memoryStore([existing]);
    const persisted: string[] = [];
    const result = await login(
      authUser({
        app_metadata: { role: "facility" },
        user_metadata: { role: "admin" },
      }),
      store,
      {
        missingRoleBehavior: "default_professional",
        persistAppRole: async (_userId, role) => {
          persisted.push(role);
        },
      },
    );

    expect(result).toEqual({
      ok: true,
      role: "facility",
      profile: existing,
      repaired: false,
    });
    expect(store.created).toHaveLength(0);
    expect(persisted).toHaveLength(0);
    expect(store.rows[0]).toEqual(existing);
  });

  it("returning Google user without app_metadata persists the existing profile role, not professional", async () => {
    const existing = makeUser({ role: "facility" });
    const store = memoryStore([existing]);
    const persisted: string[] = [];
    const result = await login(
      authUser({ app_metadata: {} }),
      store,
      {
        missingRoleBehavior: "default_professional",
        persistAppRole: async (_userId, role) => {
          persisted.push(role);
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.role).toBe("facility");
    expect(result.repaired).toBe(false);
    expect(persisted).toEqual(["facility"]);
    expect(store.created).toHaveLength(0);
  });

  it("syncs JWT professional to existing DB facility without changing the profile row", async () => {
    const existing = makeUser({ role: "facility" });
    const store = memoryStore([existing]);
    const persisted: string[] = [];
    const result = await login(
      authUser({
        app_metadata: { role: "professional" },
        user_metadata: { role: "admin" },
      }),
      store,
      {
        persistAppRole: async (_userId, role) => {
          persisted.push(role);
        },
      },
    );

    expect(result).toEqual({
      ok: true,
      role: "facility",
      profile: existing,
      repaired: false,
    });
    expect(persisted).toEqual(["facility"]);
    expect(store.created).toHaveLength(0);
    expect(store.rows[0]).toEqual(existing);
  });

  it("syncs JWT facility to existing DB professional", async () => {
    const existing = makeUser({ role: "professional" });
    const store = memoryStore([existing]);
    const persisted: string[] = [];
    const result = await login(
      authUser({ app_metadata: { role: "facility" } }),
      store,
      {
        persistAppRole: async (_userId, role) => {
          persisted.push(role);
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.role).toBe("professional");
    expect(persisted).toEqual(["professional"]);
    expect(store.rows[0]).toEqual(existing);
  });

  it("restores a legitimate DB admin over a stale non-admin JWT", async () => {
    const existing = makeUser({ role: "admin", name: "Ops Admin" });
    const store = memoryStore([existing]);
    const persisted: string[] = [];
    const result = await login(
      authUser({ app_metadata: { role: "professional" } }),
      store,
      {
        persistAppRole: async (_userId, role) => {
          persisted.push(role);
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.role).toBe("admin");
    expect(persisted).toEqual(["admin"]);
    expect(store.rows[0]?.role).toBe("admin");
  });

  it("ignores malicious user_metadata.role=admin and never persists admin from it", async () => {
    const existing = makeUser({ role: "professional" });
    const store = memoryStore([existing]);
    const persisted: string[] = [];
    const result = await login(
      authUser({
        app_metadata: { role: "facility" },
        user_metadata: { role: "admin" },
      }),
      store,
      {
        persistAppRole: async (_userId, role) => {
          persisted.push(role);
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.role).toBe("professional");
    expect(persisted).toEqual(["professional"]);
    expect(persisted).not.toContain("admin");
    expect(store.rows[0]?.role).toBe("professional");
  });

  it("does not return a stale JWT role when persist is unavailable or fails", async () => {
    const existing = makeUser({ role: "facility" });
    const store = memoryStore([existing]);

    const missingHelper = await login(
      authUser({ app_metadata: { role: "professional" } }),
      store,
    );
    expect(missingHelper).toEqual({
      ok: false,
      code: "profile_unavailable",
      logReason: "persist_role_unavailable",
    });

    const failed = await login(
      authUser({ app_metadata: { role: "admin" } }),
      store,
      {
        persistAppRole: async () => {
          throw new Error("refresh rejected");
        },
      },
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.code).toBe("profile_unavailable");
    expect(failed.logReason).toBe("persist_role_failed");
    expect(failed.logDetail).toContain("refresh rejected");
    expect(store.rows[0]?.role).toBe("facility");
  });

  it("never returns JWT admin while DB is non-admin, even before persist completes", async () => {
    const existing = makeUser({ role: "professional" });
    const store = memoryStore([existing]);
    let persistStarted = false;
    let observedRoleDuringPersist: string | undefined;

    const result = await login(
      authUser({ app_metadata: { role: "admin" } }),
      store,
      {
        persistAppRole: async (_userId, role) => {
          persistStarted = true;
          observedRoleDuringPersist = role;
        },
      },
    );

    expect(persistStarted).toBe(true);
    expect(observedRoleDuringPersist).toBe("professional");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.role).toBe("professional");
    expect(result.role).not.toBe("admin");
  });

  it("maps a thrown profile lookup to a controlled failure instead of throwing", async () => {
    const store = memoryStore();
    store.findUserByEmail = async () => {
      throw new Error(
        "connect ECONNREFUSED postgres://user:supersecret@db.internal:5432/postgres",
      );
    };

    const result = await login(authUser(), store);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("profile_unavailable");
    expect(result.logReason).toBe("profile_lookup_failed");
    expect(result.logDetail).toContain("[redacted-url]");
    expect(JSON.stringify(result)).not.toMatch(/postgres:\/\/|supersecret/i);
  });

  it("maps unexpected store errors to a controlled failure instead of throwing", async () => {
    const result = await login(authUser(), {
      hasDbConfig: () => {
        throw new Error("env read failed");
      },
      findUserByEmail: async () => null,
      createUser: async () => {
        throw new Error("should not insert");
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("profile_unavailable");
    expect(result.logReason).toBe("unexpected");
    expect(result.logDetail).toBe("env read failed");
  });
});

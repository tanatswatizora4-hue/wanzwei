import { describe, expect, it } from "vitest";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { displayNameFromAuthUser } from "@/lib/auth/display-name";
import { ensureOAuthUserProvisioned } from "@/lib/auth/oauth-provision";
import type { AppUserStore } from "@/lib/auth/provision-app-user";
import type { NewDbUser } from "@/lib/db/schema";
import type { Role, User } from "@/lib/types";

const AUTH_ID = "11111111-1111-4111-8111-111111111111";

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

function googleUser(
  overrides: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  } = {},
): SupabaseAuthUser {
  return {
    id: AUTH_ID,
    email: "pro@example.com",
    app_metadata: overrides.app_metadata ?? {},
    user_metadata: overrides.user_metadata ?? { full_name: "Tinashe Moyo" },
    aud: "authenticated",
    created_at: "2026-08-31T00:00:00.000Z",
  } as SupabaseAuthUser;
}

describe("displayNameFromAuthUser", () => {
  it("prefers Google full_name metadata", () => {
    expect(
      displayNameFromAuthUser({
        email: "pro@example.com",
        user_metadata: { full_name: "Tinashe Moyo" },
      }),
    ).toBe("Tinashe Moyo");
  });

  it("falls back to the name field, then the email local part", () => {
    expect(
      displayNameFromAuthUser({
        email: "pro@example.com",
        user_metadata: { name: "Chipo Ncube" },
      }),
    ).toBe("Chipo Ncube");
    expect(
      displayNameFromAuthUser({
        email: "pro@example.com",
        user_metadata: {},
      }),
    ).toBe("pro");
  });
});

describe("ensureOAuthUserProvisioned", () => {
  it("creates a professional profile with verified=false on first Google login", async () => {
    const store = memoryStore();
    const persisted: Role[] = [];
    const result = await ensureOAuthUserProvisioned(googleUser(), {
      store,
      persistAppRole: async (_userId, nextRole) => {
        persisted.push(nextRole);
      },
    });

    expect(result).toMatchObject({ ok: true, role: "professional" });
    expect(persisted).toEqual(["professional"]);
    expect(store.rows[0]).toMatchObject({
      id: AUTH_ID,
      role: "professional",
      verified: false,
    });
  });

  it("preserves a returning Google user's existing profile and role", async () => {
    const existing = makeUser({ role: "facility", name: "Clinic Lead" });
    const store = memoryStore([existing]);
    let persistCalls = 0;
    const result = await ensureOAuthUserProvisioned(
      googleUser({ app_metadata: { role: "facility" } }),
      {
        store,
        persistAppRole: async () => {
          persistCalls += 1;
        },
      },
    );

    expect(result).toMatchObject({ ok: true, role: "facility" });
    expect(persistCalls).toBe(0);
    expect(store.created).toHaveLength(0);
    expect(store.rows[0]).toEqual(existing);
  });

  it("reuses the existing profile after email confirmation instead of creating another", async () => {
    const existing = makeUser({ verified: false });
    const store = memoryStore([existing]);
    const result = await ensureOAuthUserProvisioned(
      googleUser({ app_metadata: { role: "professional" } }),
      {
        store,
        persistAppRole: async () => {
          throw new Error("should not persist when JWT already matches");
        },
      },
    );

    expect(result).toMatchObject({ ok: true, role: "professional" });
    expect(store.created).toHaveLength(0);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]?.verified).toBe(false);
  });

  it("syncs a stale JWT to the existing public.users role", async () => {
    const existing = makeUser({ role: "facility" });
    const store = memoryStore([existing]);
    const persisted: Role[] = [];
    const result = await ensureOAuthUserProvisioned(
      googleUser({
        app_metadata: { role: "professional" },
        user_metadata: { role: "admin" },
      }),
      {
        store,
        persistAppRole: async (_userId, nextRole) => {
          persisted.push(nextRole);
        },
      },
    );

    expect(result).toMatchObject({ ok: true, role: "facility" });
    expect(persisted).toEqual(["facility"]);
    expect(store.rows[0]).toEqual(existing);
  });

  it("cannot become admin through user_metadata", async () => {
    const store = memoryStore();
    const result = await ensureOAuthUserProvisioned(
      googleUser({
        app_metadata: {},
        user_metadata: { role: "admin", full_name: "Attacker" },
      }),
      {
        store,
        persistAppRole: async () => undefined,
      },
    );

    expect(result).toMatchObject({ ok: true, role: "professional" });
    expect(store.rows[0]?.role).toBe("professional");
  });

  it("classifies profile lookup failure without throwing", async () => {
    const store = memoryStore();
    store.findUserByEmail = async () => {
      throw new Error(
        "connect ECONNREFUSED postgres://user:supersecret@db.internal:5432/postgres",
      );
    };

    const result = await ensureOAuthUserProvisioned(googleUser(), {
      store,
      persistAppRole: async () => undefined,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("profile_unavailable");
      expect(result.logReason).toBe("profile_lookup_failed");
      expect(result.logDetail).toMatch(/\[redacted-url\]/);
    }
  });

  it("classifies UUID/email collision without leaking internals as success", async () => {
    const store = memoryStore([
      makeUser({ id: "22222222-2222-4222-8222-222222222222" }),
    ]);
    const result = await ensureOAuthUserProvisioned(googleUser(), {
      store,
      persistAppRole: async () => undefined,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("profile_unavailable");
      expect(result.logReason).toBe("email_taken");
    }
  });
});

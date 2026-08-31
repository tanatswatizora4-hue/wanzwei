import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { displayNameFromAuthUser } from "@/lib/auth/display-name";
import {
  AppUserProvisionError,
  ensureAppUserProfile,
  type AppUserStore,
} from "@/lib/auth/provision-app-user";
import { readRoleFromAuth } from "@/lib/auth/session";
import { hasDbConfig } from "@/lib/db/client";
import { createUser, findUserByEmail } from "@/lib/repos/users";
import type { Role, User } from "@/lib/types";

export type LoginAfterAuthFailureCode =
  | "no_role"
  | "db_not_configured"
  | "profile_unavailable";

export type LoginAfterAuthResult =
  | { ok: true; role: Role; profile: User; repaired: boolean }
  | {
      ok: false;
      code: LoginAfterAuthFailureCode;
      logReason: string;
      logDetail?: string;
    };

export type CompleteLoginOptions = {
  /**
   * Password/manual login rejects a missing app_metadata role when creating
   * a new profile. First-time Google may persist `professional` (never admin).
   */
  missingRoleBehavior?: "reject" | "default_professional";
  persistAppRole?: (userId: string, role: Role) => Promise<void>;
};

const defaultStore: AppUserStore = {
  hasDbConfig,
  findUserByEmail,
  createUser,
};

const DEFAULT_OAUTH_ROLE: Exclude<Role, "admin"> = "professional";

async function persistSessionRole(
  persistAppRole: CompleteLoginOptions["persistAppRole"],
  userId: string,
  role: Role,
): Promise<LoginAfterAuthResult | null> {
  if (!persistAppRole) {
    return {
      ok: false,
      code: "profile_unavailable",
      logReason: "persist_role_unavailable",
    };
  }
  try {
    await persistAppRole(userId, role);
    return null;
  } catch (error) {
    return {
      ok: false,
      code: "profile_unavailable",
      logReason: "persist_role_failed",
      logDetail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * After Supabase Auth succeeds, resolve (or repair) the public.users profile.
 *
 * For an existing matching profile, `public.users.role` is authoritative.
 * `app_metadata.role` is synced to that value and the session is refreshed
 * before login continues. user_metadata is never used for role.
 */
export async function completeLoginAfterAuth(
  authUser: Pick<
    SupabaseAuthUser,
    "id" | "email" | "app_metadata" | "user_metadata"
  >,
  store: AppUserStore = defaultStore,
  options: CompleteLoginOptions = {},
): Promise<LoginAfterAuthResult> {
  store = store ?? defaultStore;
  const missingRoleBehavior = options.missingRoleBehavior ?? "reject";
  const email = authUser.email?.trim();
  if (!email) {
    return {
      ok: false,
      code: "profile_unavailable",
      logReason: "missing_email",
    };
  }

  if (!store.hasDbConfig()) {
    return {
      ok: false,
      code: "db_not_configured",
      logReason: "db_not_configured",
    };
  }

  const existing = await store.findUserByEmail(email);
  if (existing && existing.id !== authUser.id) {
    return {
      ok: false,
      code: "profile_unavailable",
      logReason: "email_taken",
      logDetail: "An account with that email already exists.",
    };
  }

  if (existing && existing.id === authUser.id) {
    const jwtRole = readRoleFromAuth(authUser);
    if (jwtRole !== existing.role) {
      const persistError = await persistSessionRole(
        options.persistAppRole,
        authUser.id,
        existing.role,
      );
      if (persistError) return persistError;
    }
    return {
      ok: true,
      role: existing.role,
      profile: existing,
      repaired: false,
    };
  }

  let role = readRoleFromAuth(authUser);
  if (!role) {
    if (missingRoleBehavior !== "default_professional") {
      return { ok: false, code: "no_role", logReason: "missing_role" };
    }
    role = DEFAULT_OAUTH_ROLE;
    const persistError = await persistSessionRole(
      options.persistAppRole,
      authUser.id,
      role,
    );
    if (persistError) return persistError;
  }

  try {
    const profile = await ensureAppUserProfile(
      {
        authUserId: authUser.id,
        email,
        name: displayNameFromAuthUser(authUser),
        role,
      },
      store,
    );
    return { ok: true, role: profile.role, profile, repaired: true };
  } catch (error) {
    if (error instanceof AppUserProvisionError) {
      if (error.code === "db_not_configured") {
        return {
          ok: false,
          code: "db_not_configured",
          logReason: "db_not_configured",
        };
      }
      return {
        ok: false,
        code: "profile_unavailable",
        logReason: error.code,
        logDetail: error.message,
      };
    }
    return {
      ok: false,
      code: "profile_unavailable",
      logReason: "profile_create_failed",
      logDetail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

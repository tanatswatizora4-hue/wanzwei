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
import { createLogger, safeErrorDetail } from "@/lib/observability/logger";
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

const logger = createLogger("auth");

const defaultStore: AppUserStore = {
  hasDbConfig,
  findUserByEmail,
  createUser,
};

const DEFAULT_OAUTH_ROLE: Exclude<Role, "admin"> = "professional";

function authEnvFlags() {
  return {
    hasDbUrl: Boolean(process.env.SUPABASE_DB_URL?.trim()),
    hasAdminKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  };
}

function fail(
  code: LoginAfterAuthFailureCode,
  logReason: string,
  logDetail?: string,
): LoginAfterAuthResult {
  return logDetail
    ? { ok: false, code, logReason, logDetail }
    : { ok: false, code, logReason };
}

async function persistSessionRole(
  persistAppRole: CompleteLoginOptions["persistAppRole"],
  userId: string,
  role: Role,
): Promise<LoginAfterAuthResult | null> {
  if (!persistAppRole) {
    logger.warn("auth.complete_login_stage", {
      stage: "persist_role_unavailable",
      userId,
      targetRole: role,
      ...authEnvFlags(),
    });
    return fail("profile_unavailable", "persist_role_unavailable");
  }
  try {
    logger.info("auth.complete_login_stage", {
      stage: "persist_role_start",
      userId,
      targetRole: role,
      ...authEnvFlags(),
    });
    await persistAppRole(userId, role);
    logger.info("auth.complete_login_stage", {
      stage: "persist_role_ok",
      userId,
      targetRole: role,
    });
    return null;
  } catch (error) {
    logger.error("auth.complete_login_stage", error, {
      stage: "persist_role_failed",
      userId,
      targetRole: role,
      ...authEnvFlags(),
    });
    return fail(
      "profile_unavailable",
      "persist_role_failed",
      safeErrorDetail(error),
    );
  }
}

/**
 * After Supabase Auth succeeds, resolve (or repair) the public.users profile.
 *
 * For an existing matching profile, `public.users.role` is authoritative.
 * `app_metadata.role` is synced to that value and the session is refreshed
 * before login continues. user_metadata is never used for role.
 *
 * Unexpected DB/network errors are returned as `profile_unavailable` so
 * route handlers never surface a raw 500 from this path.
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
  try {
    return await runCompleteLoginAfterAuth(authUser, store, options);
  } catch (error) {
    logger.error("auth.complete_login_unexpected", error, {
      stage: "unhandled",
      userId: authUser.id,
      ...authEnvFlags(),
    });
    return fail("profile_unavailable", "unexpected", safeErrorDetail(error));
  }
}

async function runCompleteLoginAfterAuth(
  authUser: Pick<
    SupabaseAuthUser,
    "id" | "email" | "app_metadata" | "user_metadata"
  >,
  store: AppUserStore,
  options: CompleteLoginOptions,
): Promise<LoginAfterAuthResult> {
  const missingRoleBehavior = options.missingRoleBehavior ?? "reject";
  const jwtRole = readRoleFromAuth(authUser);
  const email = authUser.email?.trim();

  logger.info("auth.complete_login_stage", {
    stage: "start",
    userId: authUser.id,
    hasEmail: Boolean(email),
    hasJwtRole: jwtRole !== null,
    jwtRole,
    missingRoleBehavior,
    ...authEnvFlags(),
  });

  if (!email) {
    logger.warn("auth.complete_login_stage", {
      stage: "missing_email",
      userId: authUser.id,
    });
    return fail("profile_unavailable", "missing_email");
  }

  if (!store.hasDbConfig()) {
    logger.warn("auth.complete_login_stage", {
      stage: "db_not_configured",
      userId: authUser.id,
      ...authEnvFlags(),
    });
    return fail("db_not_configured", "db_not_configured");
  }

  let existing: User | null;
  try {
    existing = await store.findUserByEmail(email);
  } catch (error) {
    logger.error("auth.complete_login_stage", error, {
      stage: "profile_lookup_failed",
      userId: authUser.id,
      ...authEnvFlags(),
    });
    return fail(
      "profile_unavailable",
      "profile_lookup_failed",
      safeErrorDetail(error),
    );
  }

  logger.info("auth.complete_login_stage", {
    stage: "profile_lookup",
    userId: authUser.id,
    found: existing !== null,
    idMatch: existing?.id === authUser.id,
    dbRole: existing?.role ?? null,
    jwtRole,
  });

  if (existing && existing.id !== authUser.id) {
    logger.warn("auth.complete_login_stage", {
      stage: "email_taken",
      userId: authUser.id,
    });
    return fail(
      "profile_unavailable",
      "email_taken",
      "An account with that email already exists.",
    );
  }

  if (existing && existing.id === authUser.id) {
    if (jwtRole !== existing.role) {
      const persistError = await persistSessionRole(
        options.persistAppRole,
        authUser.id,
        existing.role,
      );
      if (persistError) return persistError;
    }
    logger.info("auth.complete_login_stage", {
      stage: "existing_profile",
      userId: authUser.id,
      role: existing.role,
      syncedJwt: jwtRole !== existing.role,
    });
    return {
      ok: true,
      role: existing.role,
      profile: existing,
      repaired: false,
    };
  }

  let role = jwtRole;
  if (!role) {
    if (missingRoleBehavior !== "default_professional") {
      logger.warn("auth.complete_login_stage", {
        stage: "missing_role",
        userId: authUser.id,
      });
      return fail("no_role", "missing_role");
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
    logger.info("auth.complete_login_stage", {
      stage: "create_profile_start",
      userId: authUser.id,
      role,
    });
    const profile = await ensureAppUserProfile(
      {
        authUserId: authUser.id,
        email,
        name: displayNameFromAuthUser(authUser),
        role,
      },
      store,
    );
    logger.info("auth.complete_login_stage", {
      stage: "create_profile_ok",
      userId: authUser.id,
      role: profile.role,
    });
    return { ok: true, role: profile.role, profile, repaired: true };
  } catch (error) {
    if (error instanceof AppUserProvisionError) {
      if (error.code === "db_not_configured") {
        logger.warn("auth.complete_login_stage", {
          stage: "db_not_configured",
          userId: authUser.id,
          ...authEnvFlags(),
        });
        return fail("db_not_configured", "db_not_configured");
      }
      logger.error("auth.complete_login_stage", error, {
        stage: "create_profile_failed",
        userId: authUser.id,
        provisionCode: error.code,
        ...authEnvFlags(),
      });
      return fail(
        "profile_unavailable",
        error.code,
        safeErrorDetail(error),
      );
    }
    logger.error("auth.complete_login_stage", error, {
      stage: "create_profile_failed",
      userId: authUser.id,
      ...authEnvFlags(),
    });
    return fail(
      "profile_unavailable",
      "profile_create_failed",
      safeErrorDetail(error),
    );
  }
}

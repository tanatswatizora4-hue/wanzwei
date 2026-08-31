import "server-only";

import { isDuplicateAuthUserError } from "@/lib/auth/auth-errors";
import { normalizeEmailAddress } from "@/lib/auth/email-normalize";
import { hasDbConfig } from "@/lib/db/client";
import type { NewDbUser } from "@/lib/db/schema";
import { createUser, findUserByEmail } from "@/lib/repos/users";
import { createLogger, safeErrorDetail } from "@/lib/observability/logger";
import {
  createAuthUserWithRole,
  deleteAuthUser,
  findAuthUserByEmail,
  isPublicSignupRole,
  type ExistingAuthUser,
} from "@/lib/supabase/admin";
import type { Role, User } from "@/lib/types";

const logger = createLogger("auth");

export type AppUserProvisionCode =
  | "db_not_configured"
  | "email_taken"
  | "profile_create_failed";

export class AppUserProvisionError extends Error {
  readonly code: AppUserProvisionCode;

  constructor(code: AppUserProvisionCode, message: string) {
    super(message);
    this.name = "AppUserProvisionError";
    this.code = code;
  }
}

export type EmailSignupResult =
  | { ok: true; userId: string; recovered: boolean; emailConfirmed: boolean }
  | {
      ok: false;
      code:
        | "exists"
        | "db_not_configured"
        | "profile_create_failed"
        | "create_user_failed"
        | "incomplete_signup";
      message: string;
    };

export type AppUserStore = {
  hasDbConfig: () => boolean;
  findUserByEmail: (email: string) => Promise<User | null>;
  createUser: (user: NewDbUser) => Promise<User | null>;
};

export type EmailSignupDeps = AppUserStore & {
  createAuthUserWithRole: (params: {
    email: string;
    password: string;
    name: string;
    role: Role;
  }) => Promise<{ userId: string }>;
  deleteAuthUser: (userId: string) => Promise<boolean>;
  findAuthUserByEmail: (email: string) => Promise<ExistingAuthUser | null>;
};

const defaultStore: AppUserStore = {
  hasDbConfig,
  findUserByEmail,
  createUser,
};

const defaultSignupDeps: EmailSignupDeps = {
  ...defaultStore,
  createAuthUserWithRole,
  deleteAuthUser,
  findAuthUserByEmail,
};

/**
 * Postgres unique_violation. Walks `cause` so Drizzle wrappers still match.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let i = 0; i < 4 && current && typeof current === "object"; i += 1) {
    const code = "code" in current ? (current as { code?: unknown }).code : undefined;
    if (code === "23505") return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : undefined;
  }
  return false;
}

/**
 * Create or reuse the `public.users` row for a Supabase Auth user.
 *
 * Association: `public.users.id` is the Auth user UUID (same as OAuth
 * provisioning). Login still resolves profiles by email; matching IDs keep
 * RLS `id = auth.uid()` correct if a request ever uses the user JWT.
 */
export async function ensureAppUserProfile(
  input: {
    authUserId: string;
    email: string;
    name: string;
    role: Role;
  },
  store: AppUserStore = defaultStore,
): Promise<User> {
  if (!store.hasDbConfig()) {
    throw new AppUserProvisionError(
      "db_not_configured",
      "Database is not configured.",
    );
  }

  const email = normalizeEmailAddress(input.email);
  const existing = await store.findUserByEmail(email);
  if (existing) {
    if (existing.id === input.authUserId) {
      return existing;
    }
    throw new AppUserProvisionError(
      "email_taken",
      "An account with that email already exists.",
    );
  }

  try {
    const created = await store.createUser({
      id: input.authUserId,
      email,
      name: input.name,
      role: input.role,
      verified: false,
    });
    if (!created) {
      throw new AppUserProvisionError(
        "profile_create_failed",
        "Failed to create public.users profile.",
      );
    }
    return created;
  } catch (error) {
    if (error instanceof AppUserProvisionError) throw error;
    if (isUniqueViolation(error)) {
      const raced = await store.findUserByEmail(email);
      if (raced?.id === input.authUserId) return raced;
      throw new AppUserProvisionError(
        "email_taken",
        "An account with that email already exists.",
      );
    }
    throw new AppUserProvisionError(
      "profile_create_failed",
      error instanceof Error
        ? error.message
        : "Failed to create public.users profile.",
    );
  }
}

/**
 * Email/password signup: Auth user (role in app_metadata) + public.users row.
 * Rolls back the Auth user if profile creation fails so we do not leave
 * an account that can never log in.
 */
export async function completeEmailSignup(
  input: {
    email: string;
    password: string;
    name: string;
    role: Exclude<Role, "admin">;
  },
  deps: EmailSignupDeps = defaultSignupDeps,
): Promise<EmailSignupResult> {
  if (!deps.hasDbConfig()) {
    return {
      ok: false,
      code: "db_not_configured",
      message: "Database is not configured.",
    };
  }

  const email = normalizeEmailAddress(input.email);
  const existing = await deps.findUserByEmail(email);
  if (existing) {
    return {
      ok: false,
      code: "exists",
      message: "An account with that email already exists.",
    };
  }

  let userId: string;
  try {
    const created = await deps.createAuthUserWithRole({
      email,
      password: input.password,
      name: input.name,
      role: input.role,
    });
    userId = created.userId;
  } catch (error) {
    if (isDuplicateAuthUserError(error)) {
      return recoverIncompleteSignup(
        {
          email,
          name: input.name,
        },
        deps,
      );
    }
    return {
      ok: false,
      code: "create_user_failed",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    await ensureAppUserProfile(
      {
        authUserId: userId,
        email,
        name: input.name,
        role: input.role,
      },
      deps,
    );
  } catch (error) {
    const rolledBack = await deps.deleteAuthUser(userId);
    if (!rolledBack) {
      logger.error("auth.signup_rollback_failed", error, {
        userId,
        stage: "profile_create_failed",
      });
    }
    if (
      error instanceof AppUserProvisionError &&
      error.code === "email_taken"
    ) {
      return {
        ok: false,
        code: "exists",
        message: error.message,
      };
    }
    return {
      ok: false,
      code: "profile_create_failed",
      message:
        error instanceof Error
          ? error.message
          : "Failed to create public.users profile.",
    };
  }

  return {
    ok: true,
    userId,
    recovered: false,
    emailConfirmed: false,
  };
}

async function recoverIncompleteSignup(
  input: {
    email: string;
    name: string;
  },
  deps: EmailSignupDeps,
): Promise<EmailSignupResult> {
  let existingAuth: ExistingAuthUser | null;
  try {
    existingAuth = await deps.findAuthUserByEmail(input.email);
  } catch (error) {
    logger.error("auth.incomplete_signup_lookup_failed", error, {
      detail: safeErrorDetail(error),
    });
    return {
      ok: false,
      code: "incomplete_signup",
      message:
        "This signup could not be finished. Request a confirmation email or contact support.",
    };
  }

  if (!existingAuth) {
    return {
      ok: false,
      code: "incomplete_signup",
      message:
        "This signup could not be finished. Request a confirmation email or contact support.",
    };
  }

  if (!isPublicSignupRole(existingAuth.role)) {
    return {
      ok: false,
      code: "incomplete_signup",
      message:
        "This signup could not be finished. Request a confirmation email or contact support.",
    };
  }

  const profileName = existingAuth.name.trim() || input.name;

  try {
    await ensureAppUserProfile(
      {
        authUserId: existingAuth.userId,
        email: input.email,
        name: profileName,
        role: existingAuth.role,
      },
      deps,
    );
  } catch (error) {
    if (
      error instanceof AppUserProvisionError &&
      error.code === "email_taken"
    ) {
      return {
        ok: false,
        code: "exists",
        message: error.message,
      };
    }
    return {
      ok: false,
      code: "incomplete_signup",
      message:
        "This signup could not be finished. Request a confirmation email or contact support.",
    };
  }

  return {
    ok: true,
    userId: existingAuth.userId,
    recovered: true,
    emailConfirmed: existingAuth.emailConfirmed,
  };
}

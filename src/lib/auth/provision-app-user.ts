import "server-only";

import { isDuplicateAuthUserError } from "@/lib/auth/auth-errors";
import { normalizeEmailAddress } from "@/lib/auth/email-normalize";
import { hasDbConfig } from "@/lib/db/client";
import type { NewDbUser } from "@/lib/db/schema";
import {
  attachFacilityToExistingUser,
  provisionFacilityUser,
} from "@/lib/repos/facilities";
import { createUser, findUserByEmail } from "@/lib/repos/users";
import { createLogger, safeErrorDetail } from "@/lib/observability/logger";
import {
  createAuthUserWithRole,
  deleteAuthUser,
  findAuthUserByEmail,
  isPublicSignupRole,
  type ExistingAuthUser,
} from "@/lib/supabase/admin";
import type { Facility, Role, User } from "@/lib/types";

const logger = createLogger("auth");

export type AppUserProvisionCode =
  | "db_not_configured"
  | "email_taken"
  | "profile_create_failed"
  | "facility_create_failed";

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
        | "incomplete_signup"
        | "facility_create_failed";
      message: string;
    };

export type FacilitySignupDetails = {
  organisationName: string;
  location: string;
  facilityType: Facility["type"];
};

export type AppUserStore = {
  hasDbConfig: () => boolean;
  findUserByEmail: (email: string) => Promise<User | null>;
  createUser: (user: NewDbUser) => Promise<User | null>;
  provisionFacilityUser?: (input: {
    userId: string;
    email: string;
    contactName: string;
    organisationName: string;
    location: string;
    facilityType: Facility["type"];
  }) => Promise<{ userId: string; facilityId: string; verified: boolean } | null>;
  attachFacilityToExistingUser?: (input: {
    userId: string;
    organisationName: string;
    location: string;
    facilityType: Facility["type"];
  }) => Promise<{ facilityId: string; verified: boolean } | null>;
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
  provisionFacilityUser,
  attachFacilityToExistingUser,
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

function requireFacilityDetails(
  facility: FacilitySignupDetails | undefined,
): FacilitySignupDetails {
  const organisationName = facility?.organisationName?.trim() ?? "";
  const location = facility?.location?.trim() ?? "";
  const facilityType = facility?.facilityType;
  if (!organisationName || !location || !facilityType) {
    throw new AppUserProvisionError(
      "facility_create_failed",
      "Facility organisation name, location, and type are required.",
    );
  }
  return { organisationName, location, facilityType };
}

async function linkFacilityToProfile(
  profile: User,
  facility: FacilitySignupDetails,
  store: AppUserStore,
): Promise<User> {
  if (profile.role !== "facility") return profile;
  if (profile.facilityId) return profile;
  if (!store.attachFacilityToExistingUser) {
    throw new AppUserProvisionError(
      "facility_create_failed",
      "Facility provisioning is not available.",
    );
  }
  const attached = await store.attachFacilityToExistingUser({
    userId: profile.id,
    organisationName: facility.organisationName,
    location: facility.location,
    facilityType: facility.facilityType,
  });
  if (!attached || attached.verified) {
    throw new AppUserProvisionError(
      "facility_create_failed",
      "Failed to link a facility to this account.",
    );
  }
  const refreshed = await store.findUserByEmail(profile.email);
  if (!refreshed?.facilityId) {
    throw new AppUserProvisionError(
      "facility_create_failed",
      "Failed to link a facility to this account.",
    );
  }
  return refreshed;
}

/**
 * Create or reuse the `public.users` row for a Supabase Auth user.
 *
 * Association: `public.users.id` is the Auth user UUID (same as OAuth
 * provisioning). Login still resolves profiles by email; matching IDs keep
 * RLS `id = auth.uid()` correct if a request ever uses the user JWT.
 *
 * Facility signup also creates `public.facilities` and sets
 * `users.facility_id` in the same provisioning step. Seeded facilities
 * that already have a facility_id are left unchanged.
 */
export async function ensureAppUserProfile(
  input: {
    authUserId: string;
    email: string;
    name: string;
    role: Role;
    facility?: FacilitySignupDetails;
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
      if (existing.role === "facility" && !existing.facilityId) {
        if (!input.facility) return existing;
        return linkFacilityToProfile(
          existing,
          requireFacilityDetails(input.facility),
          store,
        );
      }
      return existing;
    }
    throw new AppUserProvisionError(
      "email_taken",
      "An account with that email already exists.",
    );
  }

  try {
    if (input.role === "facility") {
      const details = requireFacilityDetails(input.facility);
      if (!store.provisionFacilityUser) {
        throw new AppUserProvisionError(
          "facility_create_failed",
          "Facility provisioning is not available.",
        );
      }
      const provisioned = await store.provisionFacilityUser({
        userId: input.authUserId,
        email,
        contactName: input.name,
        organisationName: details.organisationName,
        location: details.location,
        facilityType: details.facilityType,
      });
      if (!provisioned || provisioned.verified) {
        throw new AppUserProvisionError(
          "facility_create_failed",
          "Failed to create facility profile.",
        );
      }
      const created = await store.findUserByEmail(email);
      if (
        !created?.facilityId ||
        created.role !== "facility" ||
        created.verified
      ) {
        throw new AppUserProvisionError(
          "facility_create_failed",
          "Failed to create facility profile.",
        );
      }
      return created;
    }

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
      if (raced?.id === input.authUserId) {
        if (raced.role === "facility" && !raced.facilityId && input.facility) {
          return linkFacilityToProfile(
            raced,
            requireFacilityDetails(input.facility),
            store,
          );
        }
        return raced;
      }
      throw new AppUserProvisionError(
        "email_taken",
        "An account with that email already exists.",
      );
    }
    throw new AppUserProvisionError(
      input.role === "facility"
        ? "facility_create_failed"
        : "profile_create_failed",
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
    facility?: FacilitySignupDetails;
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
    if (
      existing.role === "facility" &&
      !existing.facilityId &&
      input.role === "facility" &&
      input.facility
    ) {
      return recoverIncompleteSignup(
        {
          email,
          name: input.name,
          facility: input.facility,
        },
        deps,
      );
    }
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
          facility: input.facility,
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
        facility: input.role === "facility" ? input.facility : undefined,
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
    if (
      error instanceof AppUserProvisionError &&
      error.code === "facility_create_failed"
    ) {
      return {
        ok: false,
        code: "facility_create_failed",
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
    facility?: FacilitySignupDetails;
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
        facility:
          existingAuth.role === "facility" ? input.facility : undefined,
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
    if (
      error instanceof AppUserProvisionError &&
      error.code === "facility_create_failed"
    ) {
      return {
        ok: false,
        code: "facility_create_failed",
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

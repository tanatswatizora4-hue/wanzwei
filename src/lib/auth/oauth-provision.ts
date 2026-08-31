import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { completeLoginAfterAuth } from "@/lib/auth/complete-login";
import { displayNameFromAuthUser } from "@/lib/auth/display-name";
import { createSessionPersistAppRole } from "@/lib/auth/persist-app-role";
import type { AppUserStore } from "@/lib/auth/provision-app-user";
import { hasDbConfig } from "@/lib/db/client";
import { createLogger } from "@/lib/observability/logger";
import { createUser, findUserByEmail } from "@/lib/repos/users";
import type { Role } from "@/lib/types";

export { displayNameFromAuthUser };
export { createSessionPersistAppRole as createOAuthPersistAppRole };

const logger = createLogger("auth");

const defaultStore: AppUserStore = {
  hasDbConfig,
  findUserByEmail,
  createUser,
};

export type OAuthProvisionDeps = {
  store?: AppUserStore;
  persistAppRole: (userId: string, role: Role) => Promise<void>;
};

/**
 * Ensure Google (and other OAuth) sign-ins have an authoritative app_metadata
 * role and a public.users profile. New users default to professional.
 * Returning users keep their existing profile role and sync the JWT to it.
 */
export async function ensureOAuthUserProvisioned(
  authUser: SupabaseAuthUser,
  deps: OAuthProvisionDeps,
): Promise<Role> {
  const result = await completeLoginAfterAuth(
    authUser,
    deps.store ?? defaultStore,
    {
      missingRoleBehavior: "default_professional",
      persistAppRole: deps.persistAppRole,
    },
  );
  if (!result.ok) {
    logger.warn("auth.oauth_provision_failed", {
      userId: authUser.id,
      reason: result.logReason,
      detail: result.logDetail,
      code: result.code,
    });
    throw new Error(
      result.logDetail ?? `OAuth provisioning failed (${result.logReason})`,
    );
  }
  return result.role;
}

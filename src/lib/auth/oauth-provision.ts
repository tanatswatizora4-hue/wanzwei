import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { completeLoginAfterAuth } from "@/lib/auth/complete-login";
import { displayNameFromAuthUser } from "@/lib/auth/display-name";
import { createSessionPersistAppRole } from "@/lib/auth/persist-app-role";
import type { AppUserStore } from "@/lib/auth/provision-app-user";
import { hasDbConfig } from "@/lib/db/client";
import { createUser, findUserByEmail } from "@/lib/repos/users";
import type { Role } from "@/lib/types";

export { displayNameFromAuthUser };
export { createSessionPersistAppRole as createOAuthPersistAppRole };

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
  authUser: Pick<
    SupabaseAuthUser,
    "id" | "email" | "app_metadata" | "user_metadata"
  >,
  deps: OAuthProvisionDeps,
) {
  return completeLoginAfterAuth(
    authUser,
    deps.store ?? defaultStore,
    {
      missingRoleBehavior: "default_professional",
      persistAppRole: deps.persistAppRole,
    },
  );
}

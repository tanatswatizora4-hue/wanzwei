import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { readRoleFromAuth } from "@/lib/auth/session";
import { hasDbConfig } from "@/lib/db/client";
import { createUser, findUserByEmail } from "@/lib/repos/users";
import { setUserRole } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

export function displayNameFromAuthUser(
  authUser: Pick<SupabaseAuthUser, "email" | "user_metadata">,
): string {
  const metadata = authUser.user_metadata as
    | { full_name?: unknown; name?: unknown }
    | undefined;

  const fullName = metadata?.full_name ?? metadata?.name;
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  const email = authUser.email?.trim();
  if (email) {
    const localPart = email.split("@")[0]?.trim();
    if (localPart) return localPart;
  }

  return "User";
}

/**
 * Ensure OAuth sign-ins have app_metadata.role and a public.users profile row.
 * New Google users default to professional.
 */
export async function ensureOAuthUserProvisioned(
  supabase: SupabaseClient,
  authUser: SupabaseAuthUser,
): Promise<Role> {
  if (!authUser.email) {
    throw new Error("OAuth user is missing an email address");
  }

  let role = readRoleFromAuth(authUser);

  if (!role) {
    await setUserRole(authUser.id, "professional");
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error(`Failed to refresh session after role assignment: ${error.message}`);
    }
    role = readRoleFromAuth(refreshed.user ?? authUser) ?? "professional";
  }

  if (hasDbConfig()) {
    const profile = await findUserByEmail(authUser.email);
    if (!profile) {
      const created = await createUser({
        id: authUser.id,
        email: authUser.email,
        name: displayNameFromAuthUser(authUser),
        role: "professional",
      });
      if (!created) {
        throw new Error("Failed to create public.users profile for OAuth user");
      }
    }
  }

  return role;
}

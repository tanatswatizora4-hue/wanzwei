import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { dashboardPathForRole } from "@/lib/auth/role-paths";
import {
  dashboardForUserWorkspace,
  resolveWorkspaceForUser,
  userHasProductRole,
} from "@/lib/auth/workspace";
import { findUserByEmail } from "@/lib/repos/users";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Role, User } from "@/lib/types";
import {
  PROFESSIONAL_VERIFICATION_REQUIRED_MESSAGE,
  isVerifiedProfessional,
} from "@/lib/auth/professional-verification";

export { dashboardPathForRole };

const ROLES: readonly Role[] = ["professional", "facility", "admin"];

/**
 * Return the currently signed-in user, or null.
 *
 * Supabase Auth owns the session. Application authorization for pages and
 * API routes uses `public.users.role` (this profile), not the JWT claim.
 * Middleware uses `app_metadata.role` as a signed cache that login/OAuth
 * sync from this profile when they differ.
 *
 * If an authenticated Supabase user has no profile row, return `null`.
 * Protected pages require a persisted app profile and will redirect to login.
 *
 * React `cache()` memoizes this for the current RSC/request only. Layout,
 * nested layouts, and pages share one Auth + profile lookup. It does not
 * persist across requests, so sessions cannot leak between users.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<User | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  return findUserByEmail(authUser.email);
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(allowedRoles: Role[]): Promise<User> {
  const user = await requireUser();
  if (allowedRoles.includes(user.role)) {
    return user;
  }
  if (await userHasProductRole(user, allowedRoles)) {
    return user;
  }
  const { workspace } = await resolveWorkspaceForUser(user);
  redirect(dashboardForUserWorkspace(user, workspace));
}

/**
 * Authenticated professional whose credentials are verified.
 * Does not redirect unverified users to login; callers must fail safely.
 */
export async function requireVerifiedProfessional(): Promise<
  { ok: true; user: User } | { ok: false; error: string }
> {
  const user = await requireRole(["professional"]);
  if (
    !isVerifiedProfessional(user, {
      professionalMembership: true,
    })
  ) {
    return { ok: false, error: PROFESSIONAL_VERIFICATION_REQUIRED_MESSAGE };
  }
  return { ok: true, user };
}

export async function getCurrentUserWithRole(
  allowedRoles: Role[],
): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (allowedRoles.includes(user.role)) return user;
  if (await userHasProductRole(user, allowedRoles)) return user;
  return null;
}

export async function signOut(): Promise<void> {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

/**
 * Read a Supabase Auth user's role from `app_metadata.role`.
 *
 * This is the signed session cache used by middleware. For an existing
 * app profile, `public.users.role` is the application source of truth;
 * login/OAuth sync this JWT claim from that row when they differ.
 *
 * SECURITY: do not fall back to a role stored in user-writable metadata.
 *
 * `user_metadata` is writable by the user themselves through the
 * Supabase client API:
 *
 *   await supabase.auth.updateUser({ data: { role: "admin" } });
 *
 * So if we trusted the user-writable role field, any logged-in user could
 * elevate themselves to admin from the browser. That's a P0
 * privilege-escalation bug.
 *
 * `app_metadata` is writable only by the service role API
 * (see `setUserRole` in `@/lib/supabase/admin`) and is embedded in
 * the signed JWT — clients cannot modify or forge it.
 *
 * Returns null when no valid role is set. Callers must treat a null
 * role as "not authorised", never as a default role.
 */
export function readRoleFromAuth(
  authUser: Pick<SupabaseAuthUser, "app_metadata">,
): Role | null {
  const candidate = (authUser.app_metadata as { role?: unknown } | undefined)
    ?.role;
  if (
    typeof candidate === "string" &&
    (ROLES as readonly string[]).includes(candidate)
  ) {
    return candidate as Role;
  }
  return null;
}

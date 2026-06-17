import "server-only";

import { redirect } from "next/navigation";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { findUserByEmail } from "@/lib/repos/users";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Role, User } from "@/lib/types";

const ROLES: readonly Role[] = ["professional", "facility", "admin"];

/**
 * Return the currently signed-in user, or null.
 *
 * Supabase Auth owns the session. The app profile is loaded from Postgres
 * by email until auth users are linked to `public.users` by FK.
 *
 * If an authenticated Supabase user has no profile row, return `null`.
 * Protected pages require a persisted app profile and will redirect to login.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  return findUserByEmail(authUser.email);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(allowedRoles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    redirect(dashboardPathForRole(user.role));
  }
  return user;
}

export async function getCurrentUserWithRole(
  allowedRoles: Role[],
): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) return null;
  return user;
}

export async function signOut(): Promise<void> {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
}

export function dashboardPathForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "facility":
      return "/facility/dashboard";
    case "professional":
    default:
      return "/professional/dashboard";
  }
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

/**
 * Read a Supabase Auth user's role from `app_metadata.role`.
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
 * the signed JWT — clients cannot modify or forge it. It is the
 * single authoritative source of truth for role.
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

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createLogger } from "@/lib/observability/logger";
import type { Role } from "@/lib/types";

/**
 * Service-role Supabase client.
 *
 * ⚠️  THIS BYPASSES ROW LEVEL SECURITY AND CAN MANAGE AUTH USERS.
 *
 * - `server-only` makes the build fail if this module is imported from a
 *   client component, so the service-role key cannot leak into the
 *   browser bundle.
 * - Only call this from route handlers, server actions, or trusted
 *   scripts. Never expose the returned client to the caller.
 */
let cached: SupabaseClient | null = null;
const logger = createLogger("supabase-admin");

export function getAdminSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Admin Supabase client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.",
    );
  }

  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

/**
 * Set a user's role in `app_metadata`. Service-role only.
 *
 * WHY app_metadata AND NOT user_metadata
 * --------------------------------------
 * `user_metadata` is writable by the user themselves via the Supabase
 * client API:
 *
 *   await supabase.auth.updateUser({ data: { role: "admin" } });
 *
 * That means if we trusted a role stored in user-writable metadata, any
 * logged-in user could self-promote to admin from the browser. This is
 * a P0 privilege-escalation bug.
 *
 * `app_metadata` is writable ONLY by the service role API (this helper)
 * and is embedded in the signed JWT. It cannot be modified client-side
 * and cannot be forged without the service-role key. It is the signed
 * session cache used by middleware. For an existing app profile,
 * `public.users.role` is the application source of truth and this claim
 * is synced from that row on login/OAuth.
 *
 * Implementation detail: `admin.updateUserById` REPLACES `app_metadata`
 * on write, so we must spread the existing object to preserve Supabase
 * Auth's own keys (`provider`, `providers`, etc.).
 */
export async function setUserRole(userId: string, role: Role): Promise<void> {
  const admin = getAdminSupabase();

  const { data: existing, error: getErr } = await admin.auth.admin.getUserById(
    userId,
  );
  if (getErr || !existing.user) {
    throw new Error(
      `Failed to read user ${userId}: ${getErr?.message ?? "user not found"}`,
    );
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...existing.user.app_metadata, role },
  });
  if (error) {
    throw new Error(`Failed to set role on ${userId}: ${error.message}`);
  }
}

/**
 * Create a Supabase Auth user with role in app_metadata (service-role only).
 * Used by signup so role assignment is atomic — anon signUp + admin getUserById
 * can fail when publishable-key signups are not immediately visible to the
 * legacy service-role admin API.
 */
export async function createAuthUserWithRole(params: {
  email: string;
  password: string;
  name: string;
  role: Role;
}): Promise<{ userId: string }> {
  const admin = getAdminSupabase();

  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: false,
    user_metadata: { name: params.name },
    app_metadata: { role: params.role },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Failed to create auth user");
  }

  return { userId: data.user.id };
}

/**
 * Hard-delete a Supabase Auth user. Used to roll back partial signups
 * when role assignment fails — without this, we'd leave an account
 * stranded with no role (and therefore no way to log in).
 *
 * Best-effort: errors are logged, not thrown, because the caller is
 * already in an error path.
 */
export async function deleteAuthUser(userId: string): Promise<void> {
  const admin = getAdminSupabase();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    logger.error("auth.rollback_delete_failed", error, { userId });
  }
}

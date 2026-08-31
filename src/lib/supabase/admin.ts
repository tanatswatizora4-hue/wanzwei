import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { normalizeEmailAddress } from "@/lib/auth/email-normalize";
import { createLogger, safeErrorDetail } from "@/lib/observability/logger";
import type { Role } from "@/lib/types";

export type ExistingAuthUser = {
  userId: string;
  email: string;
  role: Role | null;
  name: string;
  emailConfirmed: boolean;
};

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
    email: normalizeEmailAddress(params.email),
    password: params.password,
    email_confirm: false,
    user_metadata: { name: params.name },
    app_metadata: { role: params.role },
  });

  if (error || !data.user) {
    const thrown = new Error(error?.message ?? "Failed to create auth user");
    if (error?.code) {
      (thrown as Error & { code: string }).code = error.code;
    }
    if (typeof error?.status === "number") {
      (thrown as Error & { status: number }).status = error.status;
    }
    throw thrown;
  }

  return { userId: data.user.id };
}

export async function findAuthUserByEmail(
  email: string,
): Promise<ExistingAuthUser | null> {
  const admin = getAdminSupabase();
  const needle = normalizeEmailAddress(email);

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      throw new Error(safeErrorDetail(error));
    }
    const batch = data.users ?? [];
    const match = batch.find(
      (user) =>
        typeof user.email === "string" &&
        normalizeEmailAddress(user.email) === needle,
    );
    if (match) {
      const roleCandidate = (match.app_metadata as { role?: unknown } | undefined)
        ?.role;
      const role =
        roleCandidate === "professional" ||
        roleCandidate === "facility" ||
        roleCandidate === "admin"
          ? roleCandidate
          : null;
      return {
        userId: match.id,
        email: needle,
        role,
        name: explicitAuthDisplayName(match.user_metadata),
        emailConfirmed: Boolean(match.email_confirmed_at),
      };
    }
    if (batch.length < 200) break;
  }

  return null;
}

export function isPublicSignupRole(
  role: Role | null | undefined,
): role is Exclude<Role, "admin"> {
  return role === "professional" || role === "facility";
}

function explicitAuthDisplayName(userMetadata: unknown): string {
  const metadata = userMetadata as
    | { full_name?: unknown; name?: unknown }
    | undefined;
  const fullName = metadata?.full_name ?? metadata?.name;
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }
  return "";
}

/**
 * Hard-delete a Supabase Auth user. Used to roll back partial signups
 * when profile creation fails. Returns false when Auth deletion fails so
 * the caller can log a critical error without claiming signup succeeded.
 */
export async function deleteAuthUser(userId: string): Promise<boolean> {
  const admin = getAdminSupabase();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    logger.error("auth.rollback_delete_failed", error, { userId });
    return false;
  }
  return true;
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { readRoleFromAuth } from "@/lib/auth/session";
import { setUserRole } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

/**
 * Write app_metadata.role (service-role) then refresh the current session
 * so middleware cannot keep authorizing a stale JWT.
 */
export function createSessionPersistAppRole(
  supabase: SupabaseClient,
): (userId: string, role: Role) => Promise<void> {
  return async (userId, role) => {
    await setUserRole(userId, role);
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session || !data.user) {
      throw new Error(
        error?.message ?? "Failed to refresh session after role assignment",
      );
    }
    const refreshed = readRoleFromAuth(data.user);
    if (refreshed !== role) {
      throw new Error("Session role did not match the application role after refresh");
    }
  };
}

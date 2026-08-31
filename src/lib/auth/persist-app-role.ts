import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { readRoleFromAuth } from "@/lib/auth/session";
import { createLogger, safeErrorDetail } from "@/lib/observability/logger";
import { setUserRole } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

const logger = createLogger("auth");

/**
 * Write app_metadata.role (service-role) then refresh the current session
 * so middleware cannot keep authorizing a stale JWT.
 */
export function createSessionPersistAppRole(
  supabase: SupabaseClient,
): (userId: string, role: Role) => Promise<void> {
  return async (userId, role) => {
    const adminKeyConfigured = Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    );
    logger.info("auth.persist_role_stage", {
      stage: "start",
      userId,
      targetRole: role,
      adminKeyConfigured,
    });

    if (!adminKeyConfigured) {
      logger.warn("auth.persist_role_stage", {
        stage: "admin_key_missing",
        userId,
        targetRole: role,
      });
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not configured; cannot sync app_metadata.role",
      );
    }

    try {
      await setUserRole(userId, role);
    } catch (error) {
      logger.error("auth.persist_role_stage", error, {
        stage: "admin_update_failed",
        userId,
        targetRole: role,
      });
      throw new Error(safeErrorDetail(error));
    }

    logger.info("auth.persist_role_stage", {
      stage: "refresh_session_start",
      userId,
      targetRole: role,
    });
    let data;
    let error;
    try {
      const refreshed = await supabase.auth.refreshSession();
      data = refreshed.data;
      error = refreshed.error;
    } catch (refreshThrown) {
      logger.error("auth.persist_role_stage", refreshThrown, {
        stage: "refresh_session_threw",
        userId,
        targetRole: role,
      });
      throw new Error(safeErrorDetail(refreshThrown));
    }
    if (error || !data.session || !data.user) {
      logger.warn("auth.persist_role_stage", {
        stage: "refresh_session_failed",
        userId,
        targetRole: role,
        hasSession: Boolean(data.session),
        hasUser: Boolean(data.user),
        refreshError: error?.message ? safeErrorDetail(error) : undefined,
      });
      throw new Error(
        error?.message
          ? safeErrorDetail(error)
          : "Failed to refresh session after role assignment",
      );
    }
    const refreshed = readRoleFromAuth(data.user);
    if (refreshed !== role) {
      logger.warn("auth.persist_role_stage", {
        stage: "refresh_role_mismatch",
        userId,
        targetRole: role,
        refreshedRole: refreshed,
      });
      throw new Error(
        "Session role did not match the application role after refresh",
      );
    }

    logger.info("auth.persist_role_stage", {
      stage: "ok",
      userId,
      targetRole: role,
    });
  };
}

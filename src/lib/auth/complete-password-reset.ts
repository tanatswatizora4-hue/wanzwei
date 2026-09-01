import "server-only";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  PASSWORD_RESET_PUBLIC_ERRORS,
  publicMessageForPasswordUpdateError,
} from "@/lib/auth/password-reset-errors";
import { createLogger } from "@/lib/observability/logger";
import { getServerSupabase } from "@/lib/supabase/server";
import { CompletePasswordResetSchema } from "@/lib/validation/auth";

const logger = createLogger("auth-password-reset");

export async function completeAuthenticatedPasswordReset(input: {
  password: unknown;
  confirmPassword: unknown;
}): Promise<ActionResult> {
  const parsed = CompletePasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      parsed.error.issues[0]?.message ?? PASSWORD_RESET_PUBLIC_ERRORS.invalid,
    );
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return actionError(PASSWORD_RESET_PUBLIC_ERRORS.missingSession);
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    logger.warn("password_reset_update_failed", {
      userId: user.id,
      supabaseCode: error.code,
    });
    return actionError(publicMessageForPasswordUpdateError(error.message));
  }

  await supabase.auth.signOut();
  logger.info("password_reset_updated", { userId: user.id });
  return actionOk();
}

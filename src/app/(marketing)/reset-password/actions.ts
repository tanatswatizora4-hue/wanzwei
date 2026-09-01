"use server";

import { completeAuthenticatedPasswordReset } from "@/lib/auth/complete-password-reset";
import type { ActionResult } from "@/lib/action-result";

export async function completePasswordResetAction(
  formData: FormData,
): Promise<ActionResult> {
  return completeAuthenticatedPasswordReset({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
}

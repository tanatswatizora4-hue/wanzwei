"use server";

import { revalidatePath } from "next/cache";

import { applyOwnProfileUpdate } from "@/lib/auth/update-own-profile";
import { requireUser } from "@/lib/auth/session";
import {
  deleteOwnAccount,
  readDeleteOwnAccountForm,
} from "@/lib/auth/delete-own-account";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-result";

export async function updateOwnProfileAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const result = await applyOwnProfileUpdate(user, formData);
  if (result.ok) {
    revalidatePath("/professional/settings");
    revalidatePath("/facility/settings");
    revalidatePath("/admin/settings");
    revalidatePath("/facility/dashboard");
    revalidatePath("/facility/profile");
    revalidatePath("/professional/dashboard");
  }
  return result;
}

export async function deleteOwnAccountAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const requestedId = formData.get("userId");
  if (typeof requestedId === "string" && requestedId.length > 0) {
    return actionError("Those account fields cannot be changed here.");
  }

  const rateLimit = await checkRateLimit("accountDeletion", user.id);
  if (!rateLimit.success) {
    return actionError("Too many attempts. Try again later.");
  }

  const result = await deleteOwnAccount(user, readDeleteOwnAccountForm(formData));
  return result;
}

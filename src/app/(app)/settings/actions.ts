"use server";

import { revalidatePath } from "next/cache";

import { applyOwnProfileUpdate } from "@/lib/auth/update-own-profile";
import { requireUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/action-result";

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

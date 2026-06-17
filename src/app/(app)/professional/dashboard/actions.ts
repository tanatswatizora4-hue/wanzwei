"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { hasDbConfig } from "@/lib/db/client";
import { respondToEmergencyAlertForProfessionalEmail } from "@/lib/repos/emergency-alerts";
import { requireRole } from "@/lib/auth/session";
import { RespondToEmergencyAlertSchema } from "@/lib/validation/emergency";
import { ServerActionValidationError } from "@/lib/validation/errors";

export async function respondToAlertAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["professional"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = RespondToEmergencyAlertSchema.safeParse({
    alertId: formData.get("alertId"),
    response: formData.get("response"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }
  const { alertId, response } = parsed.data;
  const updated = await respondToEmergencyAlertForProfessionalEmail(
    alertId,
    user.email,
    response,
  );
  if (!updated) {
    return actionError("This alert is no longer available to respond to.");
  }

  revalidatePath("/professional/dashboard");
  revalidatePath("/facility/emergency");
  return actionOk();
}

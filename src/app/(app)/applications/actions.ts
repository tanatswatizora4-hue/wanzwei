"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { hasDbConfig } from "@/lib/db/client";
import {
  applicationBelongsToFacility,
  updateApplicationStatus,
} from "@/lib/repos/applications";
import { findFacilityForUserEmail } from "@/lib/repos/facilities";
import { requireRole } from "@/lib/auth/session";
import { UpdateApplicationStatusSchema } from "@/lib/validation/applications";
import { ServerActionValidationError } from "@/lib/validation/errors";

export async function updateApplicationStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["facility", "admin"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = UpdateApplicationStatusSchema.safeParse({
    id: formData.get("applicationId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  if (user.role === "facility") {
    const facility = await findFacilityForUserEmail(user.email);
    if (!facility) {
      return actionError("Facility profile required.");
    }
    const allowed = await applicationBelongsToFacility(
      parsed.data.id,
      facility.id,
    );
    if (!allowed) {
      return actionError("You cannot update this application.");
    }
  }

  const updated = await updateApplicationStatus(
    parsed.data.id,
    parsed.data.status,
  );
  if (!updated) {
    return actionError("Application not found.");
  }

  revalidatePath("/facility/applications");
  revalidatePath("/admin/applications");
  revalidatePath("/professional/applications");
  return actionOk();
}

"use server";

import { revalidatePath } from "next/cache";
import { cancelOwnedEmergencyAlert } from "@/lib/emergency/cancel-owned-alert";
import {
  cancelEmergencyAlertForFacility,
  createEmergencyAlert,
} from "@/lib/repos/emergency-alerts";
import { findFacilityForUserEmail } from "@/lib/repos/facilities";
import { resolveFacilityIdForUser } from "@/lib/facility-for-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/auth/session";
import {
  CancelEmergencyAlertSchema,
  CreateEmergencyAlertSchema,
} from "@/lib/validation/emergency";
import {
  ServerActionRateLimitError,
  ServerActionValidationError,
} from "@/lib/validation/errors";

export async function createAlertAction(formData: FormData) {
  const user = await requireRole(["facility"]);
  const rateLimit = await checkRateLimit("emergencyAlert", user.id);
  if (!rateLimit.success) {
    throw new ServerActionRateLimitError(rateLimit.retryAfterSeconds);
  }

  const parsed = CreateEmergencyAlertSchema.safeParse({
    profession: formData.get("profession"),
    location: formData.get("location"),
    urgency: formData.get("urgency"),
    shiftStart: formData.get("shiftStart"),
    shiftEnd: formData.get("shiftEnd"),
    notes: formData.get("notes"),
    payMin: formData.get("payMin"),
    payMax: formData.get("payMax"),
    payCurrency: formData.get("payCurrency"),
    payPeriod: formData.get("payPeriod"),
    expiresInMinutes: formData.get("expiresInMinutes"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }
  const {
    profession,
    location,
    urgency,
    shiftStart,
    shiftEnd,
    notes,
    payMin,
    payMax,
    payCurrency,
    payPeriod,
    expiresInMinutes,
  } = parsed.data;

  const facility = await findFacilityForUserEmail(user.email);
  if (!facility) {
    revalidatePath("/facility/emergency");
    return;
  }
  const facilityId = facility.id;

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + expiresInMinutes * 60 * 1000,
  ).toISOString();

  await createEmergencyAlert({
    facilityId,
    profession,
    location,
    urgency,
    shiftStart: new Date(shiftStart).toISOString(),
    shiftEnd: new Date(shiftEnd).toISOString(),
    notes,
    payMin,
    payMax,
    payCurrency,
    payPeriod,
    expiresAt,
  });

  revalidatePath("/facility/emergency");
  revalidatePath("/professional/dashboard");
}

export async function cancelAlertAction(formData: FormData) {
  const user = await requireRole(["facility"]);
  const parsed = CancelEmergencyAlertSchema.safeParse({
    alertId: formData.get("alertId"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }
  const facilityId = await resolveFacilityIdForUser(user);
  await cancelOwnedEmergencyAlert(
    { role: user.role, facilityId },
    parsed.data.alertId,
    { cancelForFacility: cancelEmergencyAlertForFacility },
  );
  revalidatePath("/facility/emergency");
  revalidatePath("/professional/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { hasDbConfig } from "@/lib/db/client";
import { requireFacilityCapability } from "@/lib/facility-for-user";
import {
  addFacilityNetworkMember,
  findNetworkMemberForFacility,
  findProfessionalIdentityByEmail,
  removeFacilityNetworkMember,
  updateFacilityNetworkMember,
} from "@/lib/repos/facility-professional-network";
import { ServerActionValidationError } from "@/lib/validation/errors";
import {
  AddNetworkMemberSchema,
  NetworkMemberTargetSchema,
  UpdateNetworkMemberSchema,
} from "@/lib/validation/broadcasts";

function revalidateNetwork() {
  revalidatePath("/facility/network");
  revalidatePath("/facility/broadcasts");
}

export async function addNetworkMemberAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasDbConfig()) return actionError("Database is not configured.");
  const context = await requireFacilityCapability(user, "manageProfessionalNetwork");
  if (!context) {
    return actionError("You cannot manage this facility professional network.");
  }

  const parsed = AddNetworkMemberSchema.safeParse({
    email: formData.get("email"),
    relationshipType: formData.get("relationshipType"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const professional = await findProfessionalIdentityByEmail(parsed.data.email);
  if (!professional) {
    return actionError("No professional account was found for that email.");
  }

  const existing = await findNetworkMemberForFacility({
    facilityId: context.facilityId,
    professionalUserId: professional.id,
  });
  if (existing) {
    return actionError("That professional is already in this facility network.");
  }

  const created = await addFacilityNetworkMember({
    facilityId: context.facilityId,
    professionalUserId: professional.id,
    relationshipType: parsed.data.relationshipType,
    addedBy: user.id,
  });
  if (!created) return actionError("Could not add that professional.");
  revalidateNetwork();
  return actionOk();
}

export async function updateNetworkMemberAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasDbConfig()) return actionError("Database is not configured.");
  const context = await requireFacilityCapability(user, "manageProfessionalNetwork");
  if (!context) {
    return actionError("You cannot manage this facility professional network.");
  }

  const parsed = UpdateNetworkMemberSchema.safeParse({
    professionalUserId: formData.get("professionalUserId"),
    relationshipType: formData.get("relationshipType") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const existing = await findNetworkMemberForFacility({
    facilityId: context.facilityId,
    professionalUserId: parsed.data.professionalUserId,
  });
  if (!existing) {
    return actionError("That professional is not in this facility network.");
  }

  const updated = await updateFacilityNetworkMember({
    facilityId: context.facilityId,
    professionalUserId: parsed.data.professionalUserId,
    relationshipType: parsed.data.relationshipType,
    status: parsed.data.status,
  });
  if (!updated) return actionError("Could not update that professional.");
  revalidateNetwork();
  return actionOk();
}

export async function removeNetworkMemberAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasDbConfig()) return actionError("Database is not configured.");
  const context = await requireFacilityCapability(user, "manageProfessionalNetwork");
  if (!context) {
    return actionError("You cannot manage this facility professional network.");
  }

  const parsed = NetworkMemberTargetSchema.safeParse({
    professionalUserId: formData.get("professionalUserId"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const existing = await findNetworkMemberForFacility({
    facilityId: context.facilityId,
    professionalUserId: parsed.data.professionalUserId,
  });
  if (!existing) {
    return actionError("That professional is not in this facility network.");
  }

  const removed = await removeFacilityNetworkMember({
    facilityId: context.facilityId,
    professionalUserId: parsed.data.professionalUserId,
  });
  if (!removed) return actionError("Could not remove that professional.");
  revalidateNetwork();
  return actionOk();
}

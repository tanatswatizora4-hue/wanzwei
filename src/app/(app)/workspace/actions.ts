"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionError, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import {
  persistWorkspacePreference,
  resolveWorkspaceForUser,
} from "@/lib/auth/workspace";
import {
  hasActiveFacilityMembership,
  hasActiveProfessionalMembership,
  parseWorkspaceCookie,
  serializeWorkspaceCookie,
} from "@/lib/auth/workspace-model";
import { hasDbConfig } from "@/lib/db/client";
import { createOwnedFacilityWorkspace } from "@/lib/repos/facilities";
import { insertProfessionalMembership } from "@/lib/repos/account-memberships";
import { updateUser } from "@/lib/repos/users";
import { CanonicalProfessionSchema } from "@/lib/professions";
import {
  RegulatoryBodyOtherSchema,
  RegulatoryBodySchema,
  isOtherRegulatoryBody,
} from "@/lib/regulatory-bodies";
import { FacilityTypeSchema } from "@/lib/validation/auth";
import { ServerActionValidationError } from "@/lib/validation/errors";
import { z } from "zod";

const SwitchWorkspaceSchema = z.object({
  workspace: z.string().trim().min(1).max(80),
});

const CreateFacilityWorkspaceSchema = z.object({
  organisationName: z.string().trim().min(1).max(160),
  location: z.string().trim().min(1).max(120),
  facilityType: FacilityTypeSchema,
});

const CreateProfessionalWorkspaceSchema = z.object({
  profession: CanonicalProfessionSchema,
  registeringBody: RegulatoryBodySchema,
  regulatoryBodyOther: RegulatoryBodyOtherSchema.optional(),
}).superRefine((value, ctx) => {
  if (isOtherRegulatoryBody(value.registeringBody) && !value.regulatoryBodyOther) {
    ctx.addIssue({
      code: "custom",
      message: "Name of regulatory body is required.",
      path: ["regulatoryBodyOther"],
    });
  }
});

export async function switchWorkspaceAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role === "admin") {
    return actionError("Admin is a system privilege, not a switchable profile.");
  }
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = SwitchWorkspaceSchema.safeParse({
    workspace: formData.get("workspace"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const preference = parseWorkspaceCookie(parsed.data.workspace);
  if (!preference) {
    return actionError("That workspace is not valid.");
  }

  const { memberships } = await resolveWorkspaceForUser(user);
  if (preference.type === "professional") {
    if (!hasActiveProfessionalMembership(memberships)) {
      return actionError("You do not have a professional profile on this account.");
    }
    await persistWorkspacePreference(preference);
    redirect("/professional/dashboard");
  }

  if (!hasActiveFacilityMembership(memberships, preference.facilityId)) {
    return actionError("You do not have access to that facility.");
  }
  await persistWorkspacePreference(preference);
  redirect("/facility/dashboard");
}

export async function createFacilityWorkspaceAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role === "admin") {
    return actionError("Admin accounts cannot create facility workspaces this way.");
  }
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = CreateFacilityWorkspaceSchema.safeParse({
    organisationName: formData.get("organisationName"),
    location: formData.get("location"),
    facilityType: formData.get("facilityType"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const created = await createOwnedFacilityWorkspace({
    userId: user.id,
    organisationName: parsed.data.organisationName,
    location: parsed.data.location,
    facilityType: parsed.data.facilityType,
  });
  if (!created) {
    return actionError("Could not create this facility workspace.");
  }

  await persistWorkspacePreference({
    type: "facility",
    facilityId: created.facilityId,
  });
  revalidatePath("/professional/settings");
  revalidatePath("/facility/settings");
  redirect("/facility/dashboard");
}

export async function createProfessionalWorkspaceAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role === "admin") {
    return actionError("Admin accounts cannot create professional workspaces this way.");
  }
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const { memberships } = await resolveWorkspaceForUser(user);
  if (hasActiveProfessionalMembership(memberships)) {
    await persistWorkspacePreference({ type: "professional" });
    redirect("/professional/dashboard");
  }

  const parsed = CreateProfessionalWorkspaceSchema.safeParse({
    profession: formData.get("profession"),
    registeringBody: formData.get("registeringBody"),
    regulatoryBodyOther: formData.get("regulatoryBodyOther") || undefined,
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  await updateUser(user.id, {
    profession: parsed.data.profession,
    registeringBody: parsed.data.registeringBody,
    regulatoryBodyOther: isOtherRegulatoryBody(parsed.data.registeringBody)
      ? parsed.data.regulatoryBodyOther ?? null
      : null,
  });

  const membership = await insertProfessionalMembership(user.id);
  if (!membership) {
    return actionError("Could not create a professional profile on this account.");
  }

  await persistWorkspacePreference({ type: "professional" });
  revalidatePath("/facility/settings");
  revalidatePath("/professional/settings");
  redirect("/professional/dashboard");
}

export { serializeWorkspaceCookie };

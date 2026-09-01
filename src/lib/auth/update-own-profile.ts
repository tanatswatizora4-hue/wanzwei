import "server-only";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { hasDbConfig } from "@/lib/db/client";
import { updateFacilityPublicProfile } from "@/lib/repos/facilities";
import { updateOwnUserProfile } from "@/lib/repos/users";
import type { Facility, User } from "@/lib/types";
import {
  assertNoProtectedSettingsFields,
  SettingsProfileUpdateSchema,
} from "@/lib/validation/profile";

export type UpdateOwnProfileStore = {
  hasDbConfig: () => boolean;
  updateOwnUserProfile: typeof updateOwnUserProfile;
  updateFacilityPublicProfile: typeof updateFacilityPublicProfile;
};

const defaultStore: UpdateOwnProfileStore = {
  hasDbConfig,
  updateOwnUserProfile,
  updateFacilityPublicProfile,
};

const PROTECTED_SETTINGS_KEYS = [
  "role",
  "verified",
  "facilityId",
  "facility_id",
  "registrationNumber",
  "registration_number",
  "registeringBody",
  "registering_body",
  "profession",
] as const;

function readOptional(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (value === null || typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readSettingsProfileForm(
  formData: FormData,
): Record<string, unknown> {
  return {
    name: readOptional(formData, "name"),
    location: readOptional(formData, "location") ?? "",
    organisationName: readOptional(formData, "organisationName"),
    facilityLocation: readOptional(formData, "facilityLocation"),
    facilityType: readOptional(formData, "facilityType"),
  };
}

export function readProtectedSettingsTamper(
  formData: FormData,
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const key of PROTECTED_SETTINGS_KEYS) {
    const value = readOptional(formData, key);
    if (value !== undefined) raw[key] = value;
  }
  return raw;
}

export async function applyOwnProfileUpdate(
  actor: User,
  formData: FormData,
  store: UpdateOwnProfileStore = defaultStore,
): Promise<ActionResult> {
  if (!store.hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const tamper = readProtectedSettingsTamper(formData);
  if (!assertNoProtectedSettingsFields(tamper)) {
    return actionError("Those account fields cannot be changed here.");
  }

  const parsed = SettingsProfileUpdateSchema.safeParse(
    readSettingsProfileForm(formData),
  );
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "Invalid profile details.");
  }

  const updated = await store.updateOwnUserProfile(actor.id, {
    name: parsed.data.name,
    location: parsed.data.location?.trim() ? parsed.data.location : null,
  });
  if (!updated) {
    return actionError("Could not save your profile.");
  }

  if (actor.role !== "facility") {
    return actionOk();
  }

  if (!actor.facilityId) {
    return actionError("Your facility profile is not linked yet.");
  }

  const facilityPatch: {
    name?: string;
    location?: string;
    type?: Facility["type"];
  } = {};
  if (parsed.data.organisationName) {
    facilityPatch.name = parsed.data.organisationName;
  }
  if (parsed.data.facilityLocation) {
    facilityPatch.location = parsed.data.facilityLocation;
  }
  if (parsed.data.facilityType) {
    facilityPatch.type = parsed.data.facilityType;
  }

  if (Object.keys(facilityPatch).length > 0) {
    const facility = await store.updateFacilityPublicProfile(
      actor.facilityId,
      facilityPatch,
    );
    if (!facility) {
      return actionError("Could not save facility details.");
    }
  }

  return actionOk();
}

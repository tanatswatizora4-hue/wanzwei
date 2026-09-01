import type { Role } from "@/lib/types";

export type CancelOwnedAlertResult = "cancelled" | "not_found" | "forbidden";

export type CancelOwnedAlertActor = {
  role: Role;
  facilityId?: string | null;
};

export type CancelOwnedAlertStore = {
  cancelForFacility: (
    alertId: string,
    facilityId: string,
  ) => Promise<boolean>;
};

/**
 * A facility may cancel only an alert owned by its own facility_id.
 * Missing or foreign alerts return not_found so another tenant's
 * existence is not leaked. Non-facility actors are forbidden.
 */
export async function cancelOwnedEmergencyAlert(
  actor: CancelOwnedAlertActor | null,
  alertId: string,
  store: CancelOwnedAlertStore,
): Promise<CancelOwnedAlertResult> {
  if (!actor) return "forbidden";
  if (actor.role !== "facility") return "forbidden";
  const facilityId = actor.facilityId?.trim();
  if (!facilityId) return "not_found";

  const cancelled = await store.cancelForFacility(alertId, facilityId);
  return cancelled ? "cancelled" : "not_found";
}

/**
 * Facility premises numbers are stored for later evidence providers.
 * There is no authoritative premises register yet, so this never verifies.
 */
export type FacilityRegistryEvidence = {
  outcome: "UNAVAILABLE";
  canAutoVerify: false;
  reason: string;
};

export function evaluateFacilityPremisesEvidence(
  premisesNumber?: string | null,
): FacilityRegistryEvidence {
  return {
    outcome: "UNAVAILABLE",
    canAutoVerify: false,
    reason: premisesNumber?.trim()
      ? "Premises number stored pending manual verification. No facility register is configured."
      : "No premises number submitted. Facility verification remains manual.",
  };
}

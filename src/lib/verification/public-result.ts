import type { Verification, VerificationStatus } from "@/lib/types";

export const HPA_BODY = "HPA";

export type PublicVerificationState = "Not submitted" | VerificationStatus;

export type AccountVerificationLabel = "Verified" | "Not verified";

export function accountVerificationLabel(
  verified: boolean | undefined,
): AccountVerificationLabel {
  return verified ? "Verified" : "Not verified";
}

export function publicVerificationMessage(
  status: PublicVerificationState,
): string {
  switch (status) {
    case "Verified":
      return "Your registration was verified.";
    case "Under Review":
      return "Your details were submitted for review.";
    case "Rejected":
      return "Your verification was not approved.";
    case "Pending":
      return "Your verification is waiting for review.";
    default:
      return "Submit your professional registration to get verified.";
  }
}

export function latestSubmissionMessage(
  accountVerified: boolean,
  latest: PublicVerificationState,
): string {
  if (accountVerified && latest === "Under Review") {
    return "Your latest credentials are under review. Your account remains verified from a previous successful match.";
  }
  if (accountVerified && latest === "Rejected") {
    return "Your latest submission was not approved. Your account remains verified from a previous successful match.";
  }
  return publicVerificationMessage(latest);
}

export function publicStateFromVerification(
  verification: Pick<Verification, "status"> | null,
): PublicVerificationState {
  if (!verification) return "Not submitted";
  return verification.status;
}

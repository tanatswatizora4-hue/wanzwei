import type { Verification, VerificationStatus } from "@/lib/types";

export type PublicVerificationState = "Not submitted" | VerificationStatus;

export function publicVerificationMessage(
  status: PublicVerificationState,
): string {
  switch (status) {
    case "Verified":
      return "Your identity and credential evidence were reviewed.";
    case "Under Review":
      return "Your details were submitted for review.";
    case "Rejected":
      return "Your verification was not approved.";
    case "Pending":
      return "Your verification is waiting for review.";
    default:
      return "Submit your identity document, practising certificate, and registration details for review.";
  }
}

export function latestSubmissionMessage(
  accountVerified: boolean,
  latest: PublicVerificationState,
): string {
  if (accountVerified && latest === "Under Review") {
    return "Your latest credentials are under review. Your account remains verified from a previous review.";
  }
  if (accountVerified && latest === "Rejected") {
    return "Your latest submission was not approved. Your account remains verified from a previous review.";
  }
  return publicVerificationMessage(latest);
}

export function publicStateFromVerification(
  verification: Pick<Verification, "status"> | null,
): PublicVerificationState {
  if (!verification) return "Not submitted";
  return verification.status;
}

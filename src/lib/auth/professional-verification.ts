import type { User } from "@/lib/types";

export const PROFESSIONAL_VERIFICATION_REQUIRED_MESSAGE =
  "Professional verification is required to use this feature.";

export function isVerifiedProfessional(
  user: Pick<User, "role" | "verified">,
  options?: { professionalMembership?: boolean },
): boolean {
  if (user.role === "admin") return false;
  const hasProfessionalIdentity =
    user.role === "professional" || options?.professionalMembership === true;
  if (!hasProfessionalIdentity) return false;
  return user.verified === true;
}

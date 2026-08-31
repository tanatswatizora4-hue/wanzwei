import type { User } from "@/lib/types";

export const PROFESSIONAL_VERIFICATION_REQUIRED_MESSAGE =
  "Professional verification is required to use this feature.";

export function isVerifiedProfessional(
  user: Pick<User, "role" | "verified">,
): boolean {
  return user.role === "professional" && user.verified === true;
}

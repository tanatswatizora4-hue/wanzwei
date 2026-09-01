export const PASSWORD_RESET_PUBLIC_ERRORS = {
  missingSession:
    "This reset link is missing or has expired. Request a new password reset email and try again.",
  mismatch: "New password and confirmation must match.",
  invalid: "Enter a password between 6 and 128 characters.",
  failed:
    "We couldn't update your password. Request a new reset email and try again.",
  differentFromCurrent:
    "Choose a password that is different from your current password.",
} as const;

export function publicMessageForPasswordUpdateError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("session") ||
    lower.includes("not authenticated") ||
    lower.includes("jwt") ||
    lower.includes("auth session missing")
  ) {
    return PASSWORD_RESET_PUBLIC_ERRORS.missingSession;
  }
  if (
    lower.includes("same password") ||
    lower.includes("different from the old") ||
    lower.includes("should be different")
  ) {
    return PASSWORD_RESET_PUBLIC_ERRORS.differentFromCurrent;
  }
  return PASSWORD_RESET_PUBLIC_ERRORS.failed;
}

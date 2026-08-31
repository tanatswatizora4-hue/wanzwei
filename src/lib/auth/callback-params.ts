import type { EmailOtpType } from "@supabase/supabase-js";

const EMAIL_OTP_TYPES = new Set<string>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export type CallbackSessionParams =
  | { kind: "code"; code: string }
  | { kind: "otp"; tokenHash: string; type: EmailOtpType }
  | { kind: "none" };

/**
 * Parse a Supabase auth callback URL. Google OAuth uses `code`.
 * Email confirmation links may use `code` (PKCE) or `token_hash` + `type`.
 */
export function parseCallbackSessionParams(url: URL): CallbackSessionParams {
  const tokenHash = url.searchParams.get("token_hash")?.trim() ?? "";
  const type = url.searchParams.get("type")?.trim() ?? "";
  if (tokenHash && EMAIL_OTP_TYPES.has(type)) {
    return { kind: "otp", tokenHash, type: type as EmailOtpType };
  }

  const code = url.searchParams.get("code")?.trim() ?? "";
  if (code) return { kind: "code", code };

  return { kind: "none" };
}

/**
 * After a session exists, honour a safe relative `next` path.
 * Legacy confirmation emails used next=/login?verified=1; send those
 * users into the app instead of the login screen.
 */
export function postAuthNextPath(
  next: string | null | undefined,
  dashboardPath: string,
): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return dashboardPath;
  }
  if (next === "/login?verified=1" || next.startsWith("/login?verified=")) {
    return dashboardPath;
  }
  return next;
}

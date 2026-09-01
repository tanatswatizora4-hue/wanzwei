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

export type CallbackAuthError =
  | { kind: "none" }
  | { kind: "otp_expired" }
  | { kind: "access_denied" }
  | { kind: "other" };

/**
 * Read GoTrue error query params from an auth callback URL.
 * Never return error_description — it can contain internal Auth detail.
 */
export function parseCallbackAuthError(url: URL): CallbackAuthError {
  const error = url.searchParams.get("error")?.trim() ?? "";
  const errorCode = url.searchParams.get("error_code")?.trim() ?? "";
  if (!error && !errorCode) return { kind: "none" };
  if (errorCode === "otp_expired" || error === "otp_expired") {
    return { kind: "otp_expired" };
  }
  if (error === "access_denied") return { kind: "access_denied" };
  return { kind: "other" };
}

export function loginErrorForCallbackAuthError(
  error: CallbackAuthError,
): "link_used_or_expired" | "auth_callback" | null {
  if (error.kind === "none") return null;
  if (error.kind === "otp_expired") return "link_used_or_expired";
  return "auth_callback";
}

export function loginErrorForAuthApiFailure(code: string | undefined): string {
  if (code === "otp_expired") return "link_used_or_expired";
  return "auth_callback";
}

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

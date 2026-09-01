import type { EmailOtpType, User as SupabaseAuthUser } from "@supabase/supabase-js";

import { loginErrorForAuthApiFailure } from "@/lib/auth/callback-params";

const EMAIL_OTP_TYPES = new Set<string>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export type ConfirmEmailParams =
  | { kind: "otp"; tokenHash: string; type: EmailOtpType; next: string | null }
  | { kind: "code"; code: string; next: string | null }
  | { kind: "missing" }
  | { kind: "malformed" };

export function isPlausibleTokenHash(value: string): boolean {
  return /^[A-Za-z0-9._~-]{16,512}$/.test(value);
}

export function isPlausibleAuthCode(value: string): boolean {
  return /^[A-Za-z0-9._~-]{16,2048}$/.test(value);
}

export function parseConfirmEmailParams(input: {
  tokenHash?: string | null;
  type?: string | null;
  code?: string | null;
  next?: string | null;
}): ConfirmEmailParams {
  const tokenHash = input.tokenHash?.trim() ?? "";
  const type = input.type?.trim() ?? "";
  const code = input.code?.trim() ?? "";
  const next = input.next?.trim() ? input.next.trim() : null;

  if (tokenHash || type) {
    if (!tokenHash || !isPlausibleTokenHash(tokenHash) || !EMAIL_OTP_TYPES.has(type)) {
      return { kind: "malformed" };
    }
    return {
      kind: "otp",
      tokenHash,
      type: type as EmailOtpType,
      next,
    };
  }

  if (code) {
    if (!isPlausibleAuthCode(code)) return { kind: "malformed" };
    return { kind: "code", code, next };
  }

  return { kind: "missing" };
}

export function parseConfirmEmailForm(formData: FormData): ConfirmEmailParams {
  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");
  const code = formData.get("code");
  const next = formData.get("next");
  return parseConfirmEmailParams({
    tokenHash: typeof tokenHash === "string" ? tokenHash : null,
    type: typeof type === "string" ? type : null,
    code: typeof code === "string" ? code : null,
    next: typeof next === "string" ? next : null,
  });
}

export function confirmLandingErrorQuery(
  kind: ConfirmEmailParams["kind"],
): "auth_callback" | "link_used_or_expired" | null {
  if (kind === "missing" || kind === "malformed") return "auth_callback";
  return null;
}

export { loginErrorForAuthApiFailure };

export function confirmationSuccessPath(
  params: Extract<ConfirmEmailParams, { kind: "otp" | "code" }>,
  authorizedDestination: string,
): string {
  if (params.kind === "otp" && params.type === "recovery") {
    return "/reset-password";
  }
  return authorizedDestination;
}

export type ConfirmableAuthUser = Pick<
  SupabaseAuthUser,
  "id" | "email" | "app_metadata" | "user_metadata"
>;

export type ConfirmAuthVerifier = {
  verifyOtp: (args: {
    type: EmailOtpType;
    token_hash: string;
  }) => Promise<{
    data: { user: ConfirmableAuthUser | null };
    error: { code?: string } | null;
  }>;
  exchangeCodeForSession: (code: string) => Promise<{
    data: { user: ConfirmableAuthUser | null };
    error: { code?: string } | null;
  }>;
};

export type ConsumeConfirmationResult =
  | { status: "missing" }
  | { status: "malformed" }
  | { status: "expired"; supabaseErrorCode?: string }
  | { status: "invalid"; supabaseErrorCode?: string }
  | { status: "verified"; user: ConfirmableAuthUser };

/**
 * Token verification for email confirmation / recovery.
 * Call only from an explicit POST (human confirm), never from a GET/prefetch.
 */
export async function consumeEmailConfirmation(
  parsed: ConfirmEmailParams,
  auth: ConfirmAuthVerifier,
): Promise<ConsumeConfirmationResult> {
  if (parsed.kind === "missing") return { status: "missing" };
  if (parsed.kind === "malformed") return { status: "malformed" };

  const sessionResult =
    parsed.kind === "otp"
      ? await auth.verifyOtp({
          type: parsed.type,
          token_hash: parsed.tokenHash,
        })
      : await auth.exchangeCodeForSession(parsed.code);

  if (sessionResult.error || !sessionResult.data.user) {
    const supabaseErrorCode = sessionResult.error?.code;
    if (loginErrorForAuthApiFailure(supabaseErrorCode) === "link_used_or_expired") {
      return { status: "expired", supabaseErrorCode };
    }
    return { status: "invalid", supabaseErrorCode };
  }

  return { status: "verified", user: sessionResult.data.user };
}

export function loginQueryForConsumeResult(
  result: Exclude<ConsumeConfirmationResult, { status: "verified" }>,
): "auth_callback" | "link_used_or_expired" {
  if (result.status === "expired") return "link_used_or_expired";
  return "auth_callback";
}

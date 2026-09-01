import "server-only";

import { createLogger } from "@/lib/observability/logger";
import { getServerSupabase } from "@/lib/supabase/server";

const logger = createLogger("auth-email");

export const SUPABASE_AUTH_EMAIL_SETUP = [
  "Supabase Auth owns email verification and password reset token generation.",
  "Configure Authentication > URL Configuration with the production site URL.",
  "Allow redirect URLs for /login, /auth/callback, and /reset-password if used as a direct redirect.",
  "Customize Supabase email templates in the dashboard if branded auth emails are required.",
] as const;

export function emailVerificationRedirectUrl(requestUrl: string): string {
  return new URL("/auth/callback", requestUrl).toString();
}

export function passwordResetRedirectUrl(requestUrl: string): string {
  return buildAuthCallbackUrl(requestUrl, "/reset-password");
}

export async function requestPasswordResetEmail(
  email: string,
  requestUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: passwordResetRedirectUrl(requestUrl),
  });

  if (error) {
    logger.warn("password_reset_request_failed", {
      email,
      supabaseError: error.message,
    });
    return { ok: false, error: error.message };
  }

  logger.info("password_reset_requested", { email });
  return { ok: true };
}

export async function resendVerificationEmail(
  email: string,
  requestUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: emailVerificationRedirectUrl(requestUrl),
    },
  });

  if (error) {
    logger.warn("verification_resend_failed", {
      email,
      supabaseError: error.message,
    });
    return { ok: false, error: error.message };
  }

  logger.info("verification_resent", { email });
  return { ok: true };
}

function buildAuthCallbackUrl(requestUrl: string, nextPath: string): string {
  const callback = new URL("/auth/callback", requestUrl);
  callback.searchParams.set("next", nextPath);
  return callback.toString();
}

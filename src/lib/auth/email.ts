import "server-only";

import { createClient } from "@supabase/supabase-js";

import { logAuthEvent, logAuthWarn } from "@/lib/observability/auth-log";
import { createLogger } from "@/lib/observability/logger";
import { getServerSupabase } from "@/lib/supabase/server";

const logger = createLogger("auth-email");

export const SUPABASE_AUTH_EMAIL_SETUP = [
  "Supabase Auth owns email verification and password reset token generation.",
  "Configure Authentication > URL Configuration with the production site URL.",
  "Allow redirect URLs for /auth/confirm, /auth/callback, /login, /signup, and /reset-password.",
  "Do not use {{ .ConfirmationURL }} in Confirm signup / Reset password templates; that GET verifies immediately.",
  "Use {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup (or type=recovery).",
] as const;

export function emailVerificationRedirectUrl(requestUrl: string): string {
  return new URL("/auth/confirm", requestUrl).toString();
}

export function passwordResetRedirectUrl(requestUrl: string): string {
  const confirm = new URL("/auth/confirm", requestUrl);
  confirm.searchParams.set("next", "/reset-password");
  return confirm.toString();
}

export async function requestPasswordResetEmail(
  email: string,
  requestUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  logAuthEvent("auth.recovery.started");
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: passwordResetRedirectUrl(requestUrl),
  });

  if (error) {
    logger.warn("password_reset_request_failed", {
      email,
      supabaseError: error.message,
    });
    logAuthWarn("auth.recovery.failed", {
      supabase_error_code: error.code,
    });
    return { ok: false, error: error.message };
  }

  logger.info("password_reset_requested", { email });
  return { ok: true };
}

function getCookielessAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function resendVerificationEmail(
  email: string,
  requestUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getCookielessAnonClient();
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

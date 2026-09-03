"use server";

import { redirect } from "next/navigation";
import { createHash } from "node:crypto";

import {
  confirmationSuccessPath,
  consumeEmailConfirmation,
  loginQueryForConsumeResult,
  parseConfirmEmailForm,
} from "@/lib/auth/confirm-email";
import {
  createOAuthPersistAppRole,
  ensureOAuthUserProvisioned,
} from "@/lib/auth/oauth-provision";
import {
  loginErrorForProvisionFailure,
} from "@/lib/auth/role-paths";
import { logAuthEvent, logAuthWarn } from "@/lib/observability/auth-log";
import { runWithRequestLog } from "@/lib/observability/request-context";
import { checkRateLimit } from "@/lib/rate-limit";
import { getServerSupabase } from "@/lib/supabase/server";

function rateLimitId(params: { tokenHash?: string; code?: string }): string {
  const material = params.tokenHash ?? params.code ?? "missing";
  return createHash("sha256").update(material).digest("hex").slice(0, 32);
}

export async function confirmEmailAction(formData: FormData) {
  const requestId = crypto.randomUUID();
  return runWithRequestLog({ requestId, route: "/auth/confirm" }, () =>
    runConfirmEmailAction(formData),
  );
}

async function runConfirmEmailAction(formData: FormData): Promise<void> {
  const parsed = parseConfirmEmailForm(formData);

  if (parsed.kind === "otp" || parsed.kind === "code") {
    const rateLimit = await checkRateLimit(
      "emailConfirmation",
      rateLimitId(
        parsed.kind === "otp"
          ? { tokenHash: parsed.tokenHash }
          : { code: parsed.code },
      ),
    );
    if (!rateLimit.success) {
      logAuthWarn("auth.confirmation.invalid", { reason: "rate_limited" });
      redirect("/login?error=rate_limited");
    }
  }

  const supabase = await getServerSupabase();
  const consumed = await consumeEmailConfirmation(parsed, {
    verifyOtp: (args) => supabase.auth.verifyOtp(args),
    exchangeCodeForSession: (code) =>
      supabase.auth.exchangeCodeForSession(code),
  });

  if (consumed.status !== "verified") {
    const event =
      consumed.status === "expired"
        ? "auth.confirmation.expired"
        : "auth.confirmation.invalid";
    logAuthWarn(event, {
      reason: consumed.status,
      supabase_error_code:
        consumed.status === "expired" || consumed.status === "invalid"
          ? consumed.supabaseErrorCode
          : undefined,
    });
    if (parsed.kind === "otp" && parsed.type === "recovery") {
      logAuthWarn("auth.recovery.failed", { reason: consumed.status });
    }
    redirect(`/login?error=${loginQueryForConsumeResult(consumed)}`);
  }

  const provisioned = await ensureOAuthUserProvisioned(consumed.user, {
    persistAppRole: createOAuthPersistAppRole(supabase),
  });
  if (!provisioned.ok) {
    logAuthWarn("auth.confirmation.invalid", {
      userId: consumed.user.id,
      reason: provisioned.logReason,
      code: provisioned.code,
    });
    await supabase.auth.signOut();
    redirect(`/login?error=${loginErrorForProvisionFailure(provisioned.code)}`);
  }

  if (parsed.kind !== "otp" && parsed.kind !== "code") {
    redirect("/login?error=auth_callback");
  }

  const destination = confirmationSuccessPath(parsed);
  const isRecovery = parsed.kind === "otp" && parsed.type === "recovery";
  if (!isRecovery) {
    await supabase.auth.signOut();
  }
  logAuthEvent(
    isRecovery ? "auth.recovery.success" : "auth.confirmation.success",
    {
      userId: consumed.user.id,
      role: provisioned.role,
      destination,
    },
  );
  redirect(destination);
}

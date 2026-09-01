import { NextResponse } from "next/server";

import {
  loginErrorForAuthApiFailure,
  loginErrorForCallbackAuthError,
  parseCallbackAuthError,
  parseCallbackSessionParams,
} from "@/lib/auth/callback-params";
import {
  authorizedPostAuthPath,
  loginErrorForProvisionFailure,
} from "@/lib/auth/role-paths";
import {
  ensureOAuthUserProvisioned,
  createOAuthPersistAppRole,
} from "@/lib/auth/oauth-provision";
import { logAuthEvent, logAuthWarn } from "@/lib/observability/auth-log";
import { withRouteLogging } from "@/lib/observability/logger";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withRouteLogging("/auth/callback", req, () => handleGET(req));
}

async function handleGET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next");
  const callbackError = parseCallbackAuthError(url);
  const mappedError = loginErrorForCallbackAuthError(callbackError);
  if (mappedError) {
    logAuthWarn(
      mappedError === "link_used_or_expired"
        ? "auth.confirmation.expired"
        : "auth.confirmation.invalid",
      { supabase_error_code: url.searchParams.get("error_code") },
    );
    return NextResponse.redirect(
      new URL(`/login?error=${mappedError}`, req.url),
    );
  }

  const sessionParams = parseCallbackSessionParams(url);

  if (sessionParams.kind === "otp") {
    const confirm = new URL("/auth/confirm", req.url);
    confirm.searchParams.set("token_hash", sessionParams.tokenHash);
    confirm.searchParams.set("type", sessionParams.type);
    if (next) confirm.searchParams.set("next", next);
    logAuthEvent("auth.confirmation.landing", { via: "callback_redirect" });
    return NextResponse.redirect(confirm);
  }

  if (sessionParams.kind === "none") {
    logAuthWarn("auth.google.exchange_failed", { reason: "missing_code" });
    return NextResponse.redirect(new URL("/login?error=auth_callback", req.url));
  }

  logAuthEvent("auth.google.callback_received");
  const supabase = await getServerSupabase();
  const sessionResult = await supabase.auth.exchangeCodeForSession(
    sessionParams.code,
  );

  if (sessionResult.error || !sessionResult.data.user) {
    logAuthWarn("auth.google.exchange_failed", {
      supabase_error_code: sessionResult.error?.code,
    });
    const loginError = loginErrorForAuthApiFailure(sessionResult.error?.code);
    return NextResponse.redirect(
      new URL(`/login?error=${loginError}`, req.url),
    );
  }

  logAuthEvent("auth.google.exchange_success", {
    userId: sessionResult.data.user.id,
  });

  const provisioned = await ensureOAuthUserProvisioned(sessionResult.data.user, {
    persistAppRole: createOAuthPersistAppRole(supabase),
  });

  if (!provisioned.ok) {
    logAuthWarn("auth.google.provision_failed", {
      userId: sessionResult.data.user.id,
      reason: provisioned.logReason,
      code: provisioned.code,
    });
    await supabase.auth.signOut();
    const loginError = loginErrorForProvisionFailure(provisioned.code);
    return NextResponse.redirect(
      new URL(`/login?error=${loginError}`, req.url),
    );
  }

  logAuthEvent("auth.google.provision_success", {
    userId: sessionResult.data.user.id,
    role: provisioned.role,
  });

  const destination = authorizedPostAuthPath(next, provisioned.role);
  logAuthEvent("auth.google.redirect", {
    userId: sessionResult.data.user.id,
    role: provisioned.role,
    destination,
  });
  return NextResponse.redirect(new URL(destination, req.url));
}

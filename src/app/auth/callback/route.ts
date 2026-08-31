import { NextResponse } from "next/server";

import { parseCallbackSessionParams, postAuthNextPath } from "@/lib/auth/callback-params";
import { ensureOAuthUserProvisioned, createOAuthPersistAppRole } from "@/lib/auth/oauth-provision";
import { dashboardPathForRole } from "@/lib/auth/session";
import { logException, withRouteLogging } from "@/lib/observability/logger";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withRouteLogging("/auth/callback", req, () => handleGET(req));
}

async function handleGET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next");
  const sessionParams = parseCallbackSessionParams(url);

  if (sessionParams.kind === "none") {
    return NextResponse.redirect(new URL("/login?error=auth_callback", req.url));
  }

  const supabase = await getServerSupabase();
  const sessionResult =
    sessionParams.kind === "otp"
      ? await supabase.auth.verifyOtp({
          type: sessionParams.type,
          token_hash: sessionParams.tokenHash,
        })
      : await supabase.auth.exchangeCodeForSession(sessionParams.code);

  if (sessionResult.error || !sessionResult.data.user) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", req.url));
  }

  let role;
  try {
    role = await ensureOAuthUserProvisioned(sessionResult.data.user, {
      persistAppRole: createOAuthPersistAppRole(supabase),
    });
  } catch (e) {
    logException("auth", "auth.oauth_provision_failed", e, {
      userId: sessionResult.data.user.id,
      email: sessionResult.data.user.email,
    });
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=profile_missing", req.url));
  }

  const destination = postAuthNextPath(next, dashboardPathForRole(role));
  return NextResponse.redirect(new URL(destination, req.url));
}

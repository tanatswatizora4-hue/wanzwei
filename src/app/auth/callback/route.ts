import { NextResponse } from "next/server";

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
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", req.url));
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", req.url));
  }

  let role;
  try {
    role = await ensureOAuthUserProvisioned(data.user, {
      persistAppRole: createOAuthPersistAppRole(supabase),
    });
  } catch (e) {
    logException("auth", "auth.oauth_provision_failed", e, {
      userId: data.user.id,
      email: data.user.email,
    });
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=profile_missing", req.url));
  }

  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(new URL(next, req.url));
  }

  return NextResponse.redirect(new URL(dashboardPathForRole(role), req.url));
}

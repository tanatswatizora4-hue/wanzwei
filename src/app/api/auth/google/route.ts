import { NextResponse } from "next/server";

import { GOOGLE_SIGNIN_PUBLIC } from "@/lib/auth/google-signin-public";
import { logAuthEvent, logAuthWarn } from "@/lib/observability/auth-log";
import { withRouteLogging } from "@/lib/observability/logger";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withRouteLogging("/api/auth/google", req, () => handleGET(req));
}

async function handleGET(req: Request) {
  if (!GOOGLE_SIGNIN_PUBLIC) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  logAuthEvent("auth.google.started");

  const requestUrl = new URL(req.url);
  const origin = requestUrl.origin;
  const next = requestUrl.searchParams.get("next");

  let redirectTo = `${origin}/auth/callback`;
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error || !data.url) {
    logAuthWarn("auth.google.exchange_failed", {
      reason: "oauth_init_failed",
      supabase_error_code: error?.code,
    });
    return NextResponse.redirect(new URL("/login?error=google", req.url));
  }

  return NextResponse.redirect(data.url);
}

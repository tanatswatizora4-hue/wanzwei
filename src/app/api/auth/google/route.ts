import { NextResponse } from "next/server";

import { createLogger, withRouteLogging } from "@/lib/observability/logger";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const logger = createLogger("auth");

export async function GET(req: Request) {
  return withRouteLogging("/api/auth/google", req, () => handleGET(req));
}

async function handleGET(req: Request) {
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
    logger.warn("auth.google_oauth_failed", {
      supabaseError: error?.message,
    });
    return NextResponse.redirect(new URL("/login?error=google", req.url));
  }

  return NextResponse.redirect(data.url);
}

import { NextResponse } from "next/server";

import { dashboardPathForRole, readRoleFromAuth } from "@/lib/auth/session";
import { withRouteLogging } from "@/lib/observability/logger";
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

  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(new URL(next, req.url));
  }

  const role = readRoleFromAuth(data.user);
  const fallback = role ? dashboardPathForRole(role) : "/login";
  return NextResponse.redirect(new URL(fallback, req.url));
}

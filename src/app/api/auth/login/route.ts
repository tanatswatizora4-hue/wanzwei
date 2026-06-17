import { NextResponse } from "next/server";

import {
  dashboardPathForRole,
  readRoleFromAuth,
} from "@/lib/auth/session";
import { hasDbConfig } from "@/lib/db/client";
import { findUserByEmail } from "@/lib/repos/users";
import {
  addRateLimitHeaders,
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimitKeyFromRequest,
} from "@/lib/rate-limit";
import { createLogger, withRouteLogging } from "@/lib/observability/logger";
import { getServerSupabase } from "@/lib/supabase/server";
import { LoginSchema } from "@/lib/validation/auth";
import { validationErrorResponse } from "@/lib/validation/errors";

export const runtime = "nodejs";

const logger = createLogger("auth");

export async function POST(req: Request) {
  return withRouteLogging("/api/auth/login", req, () => handlePOST(req));
}

async function handlePOST(req: Request) {
  const formData = await req.formData();
  const rawEmail = formData.get("email");
  const rawNext = formData.get("next");
  const rateLimit = await checkRateLimit(
    "login",
    rateLimitKeyFromRequest(req, typeof rawEmail === "string" ? rawEmail : ""),
  );
  if (!rateLimit.success) {
    logger.warn("auth.login_failed", {
      reason: "rate_limited",
      email: typeof rawEmail === "string" ? rawEmail : undefined,
    });
    if (wantsJson(req)) {
      return rateLimitJsonResponse(rateLimit);
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "rate_limited");
    if (typeof rawEmail === "string" && rawEmail) {
      url.searchParams.set("email", rawEmail);
    }
    return addRateLimitHeaders(
      NextResponse.redirect(url, { status: 303 }),
      rateLimit,
    );
  }

  const parsed = LoginSchema.safeParse({
    email: typeof rawEmail === "string" ? rawEmail : "",
    password:
      typeof formData.get("password") === "string"
        ? formData.get("password")
        : "",
    next: typeof rawNext === "string" && rawNext ? rawNext : undefined,
  });

  if (!parsed.success) {
    logger.warn("auth.login_failed", {
      reason: "validation_failed",
      email: typeof rawEmail === "string" ? rawEmail : undefined,
    });
    if (wantsJson(req)) {
      return validationErrorResponse(parsed.error);
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "invalid");
    if (typeof rawEmail === "string" && rawEmail) {
      url.searchParams.set("email", rawEmail);
    }
    return NextResponse.redirect(url, { status: 303 });
  }

  const { email, password, next: nextPath } = parsed.data;
  const supabase = await getServerSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    const supabaseMessage = error?.message ?? "";
    const isNetworkFailure =
      supabaseMessage === "fetch failed" ||
      /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(supabaseMessage);
    logger.warn("auth.login_failed", {
      reason: isNetworkFailure ? "supabase_unreachable" : "invalid_credentials",
      email,
      supabaseError: supabaseMessage || undefined,
    });
    const url = new URL("/login", req.url);
    url.searchParams.set("error", isNetworkFailure ? "unavailable" : "invalid");
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, { status: 303 });
  }

  // Read role from app_metadata only — see `readRoleFromAuth` for why
  // `user_metadata` is never trusted. A signed-in user with no role is
  // an inconsistent state (signup rollback failed, or the account was
  // created out-of-band without one) and we refuse to issue a session
  // for them.
  const role = readRoleFromAuth(data.user);
  if (!role) {
    logger.warn("auth.login_failed", {
      reason: "missing_role",
      email,
      userId: data.user.id,
    });
    await supabase.auth.signOut();
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "no_role");
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!hasDbConfig()) {
    logger.warn("auth.login_failed", {
      reason: "db_not_configured",
      email,
      userId: data.user.id,
    });
    await supabase.auth.signOut();
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "db_not_configured");
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, { status: 303 });
  }

  const profile = await findUserByEmail(email);
  if (!profile) {
    logger.warn("auth.login_failed", {
      reason: "profile_missing",
      email,
      userId: data.user.id,
    });
    await supabase.auth.signOut();
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "profile_missing");
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, { status: 303 });
  }

  const redirectTo = nextPath ?? dashboardPathForRole(role);
  return NextResponse.redirect(new URL(redirectTo, req.url), { status: 303 });
}

function wantsJson(req: Request): boolean {
  return req.headers.get("accept")?.includes("application/json") ?? false;
}

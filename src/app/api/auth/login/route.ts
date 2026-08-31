import { NextResponse } from "next/server";

import { completeLoginAfterAuth } from "@/lib/auth/complete-login";
import { createSessionPersistAppRole } from "@/lib/auth/persist-app-role";
import { dashboardPathForRole } from "@/lib/auth/session";
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

  // Existing public.users.role is authoritative. app_metadata.role is the
  // signed session cache and is synced from the profile when they differ.
  // Missing public.users rows for a valid Auth user are repaired in-place.
  const login = await completeLoginAfterAuth(data.user, undefined, {
    persistAppRole: createSessionPersistAppRole(supabase),
  });
  if (!login.ok) {
    logger.warn("auth.login_failed", {
      reason: login.logReason,
      email,
      userId: data.user.id,
      detail: login.logDetail,
    });
    await supabase.auth.signOut();
    const url = new URL("/login", req.url);
    url.searchParams.set(
      "error",
      login.code === "profile_unavailable" ? "profile_missing" : login.code,
    );
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, { status: 303 });
  }

  const redirectTo = nextPath ?? dashboardPathForRole(login.role);
  return NextResponse.redirect(new URL(redirectTo, req.url), { status: 303 });
}

function wantsJson(req: Request): boolean {
  return req.headers.get("accept")?.includes("application/json") ?? false;
}

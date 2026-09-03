import { NextResponse } from "next/server";

import { isEmailNotConfirmedError } from "@/lib/auth/auth-errors";
import { completeLoginAfterAuth } from "@/lib/auth/complete-login";
import { createSessionPersistAppRole } from "@/lib/auth/persist-app-role";
import { authorizedPostAuthPath } from "@/lib/auth/role-paths";
import { isEmailAuthConfirmed } from "@/lib/auth/signup-session";
import { logAuthEvent, logAuthWarn } from "@/lib/observability/auth-log";
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
    logAuthWarn("auth.password.login_failed", {
      reason: "rate_limited",
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
    logAuthWarn("auth.password.login_failed", {
      reason: "validation_failed",
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
    const unconfirmed = isEmailNotConfirmedError(error);
    logAuthWarn("auth.password.login_failed", {
      reason: isNetworkFailure
        ? "supabase_unreachable"
        : unconfirmed
          ? "email_not_confirmed"
          : "invalid_credentials",
      supabase_error_code: error?.code,
    });
    const url = new URL("/login", req.url);
    url.searchParams.set(
      "error",
      isNetworkFailure ? "unavailable" : unconfirmed ? "unconfirmed" : "invalid",
    );
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!isEmailAuthConfirmed(data.user)) {
    logAuthWarn("auth.password.login_failed", {
      reason: "email_not_confirmed",
      userId: data.user.id,
    });
    await supabase.auth.signOut();
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "unconfirmed");
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, { status: 303 });
  }

  // Existing public.users.role is authoritative. app_metadata.role is the
  // signed session cache and is synced from the profile when they differ.
  // Missing public.users rows for a valid Auth user are repaired in-place.
  let login;
  try {
    login = await completeLoginAfterAuth(data.user, undefined, {
      persistAppRole: createSessionPersistAppRole(supabase),
    });
  } catch (error) {
    logger.error("auth.login_unhandled", error, {
      userId: data.user.id,
      email,
    });
    await supabase.auth.signOut();
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "profile_missing");
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, { status: 303 });
  }
  if (!login.ok) {
    logAuthWarn("auth.password.login_failed", {
      reason: login.logReason,
      userId: data.user.id,
      code: login.code,
    });
    await supabase.auth.signOut();
    const url = new URL("/login", req.url);
    url.searchParams.set(
      "error",
      login.code === "profile_unavailable"
        ? "profile_missing"
        : login.code === "account_closed"
          ? "account_closed"
          : login.code,
    );
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, { status: 303 });
  }

  const redirectTo = authorizedPostAuthPath(nextPath, login.role);
  logAuthEvent("auth.password.login_success", {
    userId: data.user.id,
    role: login.role,
    destination: redirectTo,
  });
  return NextResponse.redirect(new URL(redirectTo, req.url), { status: 303 });
}

function wantsJson(req: Request): boolean {
  return req.headers.get("accept")?.includes("application/json") ?? false;
}

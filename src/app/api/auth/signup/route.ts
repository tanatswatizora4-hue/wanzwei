import { NextResponse } from "next/server";

import {
  readSignupPayload,
  signupFieldFlags,
} from "@/lib/auth/signup-payload";
import { dashboardPathForRole } from "@/lib/auth/session";
import {
  addRateLimitHeaders,
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimitKeyFromRequest,
} from "@/lib/rate-limit";
import {
  createLogger,
  logException,
  withRouteLogging,
} from "@/lib/observability/logger";
import { createAuthUserWithRole } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { SignupSchema } from "@/lib/validation/auth";
import { validationErrorResponse } from "@/lib/validation/errors";

export const runtime = "nodejs";

const logger = createLogger("auth");

/**
 * Sign up flow:
 *   1. Zod-validate input. Admin role is REJECTED at the schema level
 *      so an attacker can't smuggle `role=admin` in the form payload.
 *   2. `admin.auth.admin.createUser` creates the auth user with role in
 *      `app_metadata` in one atomic service-role call.
 *   3. `signInWithPassword` establishes a session when email confirmation
 *      is disabled; otherwise redirect to /login with a check-email hint.
 */
export async function POST(req: Request) {
  return withRouteLogging("/api/auth/signup", req, () => handlePOST(req));
}

async function handlePOST(req: Request) {
  const formData = await req.formData();
  const payload = readSignupPayload(formData);
  const fields = signupFieldFlags(payload);

  const rateLimit = await checkRateLimit(
    "signup",
    rateLimitKeyFromRequest(req, payload.email ?? ""),
  );
  if (!rateLimit.success) {
    logger.warn("auth.signup_failed", {
      reason: "rate_limited",
      ...fields,
      email: payload.email,
    });
    if (wantsJson(req)) {
      return rateLimitJsonResponse(rateLimit);
    }
    const url = new URL("/signup", req.url);
    url.searchParams.set("error", "rate_limited");
    return addRateLimitHeaders(
      NextResponse.redirect(url, { status: 303 }),
      rateLimit,
    );
  }

  const parsed = SignupSchema.safeParse(payload);

  if (!parsed.success) {
    const invalidFields = [
      ...new Set(
        parsed.error.issues.map((issue) => String(issue.path[0] ?? "unknown")),
      ),
    ];
    logger.warn("auth.signup_failed", {
      reason: "validation_failed",
      ...fields,
      invalidFields,
      email: payload.email,
    });
    if (wantsJson(req)) {
      return validationErrorResponse(parsed.error);
    }
    const url = new URL("/signup", req.url);
    url.searchParams.set("error", "missing");
    if (payload.role === "professional" || payload.role === "facility") {
      url.searchParams.set("role", payload.role);
    }
    return NextResponse.redirect(url, { status: 303 });
  }

  const { name, email, password, role } = parsed.data;

  logger.info("auth.signup_payload", {
    ...fields,
    invalidFields: [] as string[],
    email,
  });

  try {
    await createAuthUserWithRole({ email, password, name, role });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const lowered = message.toLowerCase();
    logger.warn("auth.signup_failed", {
      reason: "create_user_failed",
      ...fields,
      email,
      role,
      supabaseError: message,
    });

    if (wantsJson(req)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const url = new URL("/signup", req.url);
    const code =
      lowered.includes("registered") ||
      lowered.includes("already") ||
      lowered.includes("exists")
        ? "exists"
        : lowered.includes("rate limit")
          ? "rate_limited"
          : "server";
    url.searchParams.set("error", code);
    if (role === "professional" || role === "facility") {
      url.searchParams.set("role", role);
    }
    return NextResponse.redirect(url, { status: 303 });
  }

  const supabase = await getServerSupabase();
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError) {
    logException("auth", "auth.signup_sign_in_failed", signInError, {
      email,
      role,
    });
    const url = new URL("/login", req.url);
    url.searchParams.set("check-email", "1");
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!signInData.session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("check-email", "1");
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, { status: 303 });
  }

  return NextResponse.redirect(new URL(dashboardPathForRole(role), req.url), {
    status: 303,
  });
}

function wantsJson(req: Request): boolean {
  return req.headers.get("accept")?.includes("application/json") ?? false;
}

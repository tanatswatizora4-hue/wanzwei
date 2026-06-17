import { NextResponse } from "next/server";

import { emailVerificationRedirectUrl } from "@/lib/auth/email";
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
import { deleteAuthUser, setUserRole } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { SignupSchema } from "@/lib/validation/auth";
import { validationErrorResponse } from "@/lib/validation/errors";

export const runtime = "nodejs";

const logger = createLogger("auth");

/**
 * Sign up flow:
 *   1. Zod-validate input. Admin role is REJECTED at the schema level
 *      so an attacker can't smuggle `role=admin` in the form payload.
 *   2. `supabase.auth.signUp` creates the auth user (no role attached).
 *   3. `setUserRole` writes the requested role into `app_metadata` via
 *      the service-role admin API. This is the ONLY way role can ever
 *      enter the system. A user-writable role field is never set, because
 *      anything in `user_metadata` is self-writable from the browser.
 *   4. If step 3 fails, hard-delete the auth user so we don't leave a
 *      stranded "no-role" account that can authenticate but can't be
 *      authorised.
 */
export async function POST(req: Request) {
  return withRouteLogging("/api/auth/signup", req, () => handlePOST(req));
}

async function handlePOST(req: Request) {
  const formData = await req.formData();
  const rawEmail = formData.get("email");
  const rateLimit = await checkRateLimit(
    "signup",
    rateLimitKeyFromRequest(req, typeof rawEmail === "string" ? rawEmail : ""),
  );
  if (!rateLimit.success) {
    logger.warn("auth.signup_failed", {
      reason: "rate_limited",
      email: typeof rawEmail === "string" ? rawEmail : undefined,
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

  const parsed = SignupSchema.safeParse({
    name: formData.get("name"),
    email: rawEmail,
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    logger.warn("auth.signup_failed", {
      reason: "validation_failed",
      email: typeof rawEmail === "string" ? rawEmail : undefined,
    });
    if (wantsJson(req)) {
      return validationErrorResponse(parsed.error);
    }
    const url = new URL("/signup", req.url);
    url.searchParams.set("error", "missing");
    return NextResponse.redirect(url, { status: 303 });
  }

  const { name, email, password, role } = parsed.data;
  const supabase = await getServerSupabase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // User metadata is for display-only fields. NEVER put role here — it's
      // user-writable via supabase.auth.updateUser({ data: {...} }).
      data: { name },
      emailRedirectTo: emailVerificationRedirectUrl(req.url),
    },
  });

  if (error || !data.user) {
    logger.warn("auth.signup_failed", {
      reason: "supabase_signup_failed",
      email,
      role,
      supabaseError: error?.message,
    });
    const url = new URL("/signup", req.url);
    const message = error?.message.toLowerCase() ?? "";
    const code =
      message.includes("registered") ||
      message.includes("already") ||
      message.includes("exists")
        ? "exists"
        : "missing";
    url.searchParams.set("error", code);
    return NextResponse.redirect(url, { status: 303 });
  }

  try {
    await setUserRole(data.user.id, role);
  } catch (e) {
    // Roll back the half-created user. Without this we'd strand a user
    // who has auth but no role and can never log in.
    logException("auth", "auth.signup_role_assignment_failed", e, {
      email,
      role,
      userId: data.user.id,
    });
    await deleteAuthUser(data.user.id);
    const url = new URL("/signup", req.url);
    url.searchParams.set("error", "missing");
    return NextResponse.redirect(url, { status: 303 });
  }

  // If email confirmation is enabled, `signUp` returns a user but no
  // session — bounce to /login with a "check your email" hint. The role
  // is already set in app_metadata so first login works as soon as they
  // verify.
  if (!data.session) {
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

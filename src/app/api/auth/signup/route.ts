import { NextResponse } from "next/server";

import {
  readSignupPayload,
  signupFieldFlags,
} from "@/lib/auth/signup-payload";
import { resendVerificationEmail } from "@/lib/auth/email";
import { completeEmailSignup } from "@/lib/auth/provision-app-user";
import { logAuthEvent, logAuthWarn } from "@/lib/observability/auth-log";
import {
  addRateLimitHeaders,
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimitKeyFromRequest,
} from "@/lib/rate-limit";
import { withRouteLogging } from "@/lib/observability/logger";
import { SignupSchema } from "@/lib/validation/auth";
import { validationErrorResponse } from "@/lib/validation/errors";

export const runtime = "nodejs";

/**
 * Sign up flow:
 *   1. Zod-validate input. Admin role is REJECTED at the schema level
 *      so an attacker can't smuggle `role=admin` in the form payload.
 *   2. Create the Auth user (role in `app_metadata`) and the matching
 *      `public.users` row (`id` = Auth UUID). Roll back Auth if the
 *      profile insert fails.
 *   3. Request a real confirmation email. Do not sign in while the
 *      Auth user is unconfirmed.
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
    logAuthWarn("auth.signup.started", {
      reason: "rate_limited",
      ...fields,
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
    logAuthWarn("auth.signup.started", {
      reason: "validation_failed",
      invalidFields,
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

  const { name, email, password, role, organisationName, location, facilityType } =
    parsed.data;

  logAuthEvent("auth.signup.started", { role });

  const provisioned = await completeEmailSignup({
    email,
    password,
    name,
    role,
    facility:
      role === "facility" && organisationName && location && facilityType
        ? {
            organisationName,
            location,
            facilityType,
          }
        : undefined,
  });

  if (!provisioned.ok) {
    logAuthWarn("auth.signup.started", {
      reason: provisioned.code,
      role,
    });

    if (wantsJson(req)) {
      return NextResponse.json(
        { error: provisioned.message, code: provisioned.code },
        { status: signupErrorStatus(provisioned.code) },
      );
    }

    const url = new URL("/signup", req.url);
    url.searchParams.set("error", signupErrorQuery(provisioned.code));
    url.searchParams.set("role", role);
    if (provisioned.code === "incomplete_signup") {
      url.searchParams.set("email", email);
    }
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!provisioned.emailConfirmed) {
    const confirmation = await resendVerificationEmail(email, req.url);
    if (!confirmation.ok) {
      logAuthWarn("auth.signup.created", {
        role,
        recovered: provisioned.recovered,
        confirmation_send_failed: true,
      });
    }
  }

  logAuthEvent("auth.signup.created", {
    role,
    recovered: provisioned.recovered,
    emailConfirmed: provisioned.emailConfirmed,
  });

  if (wantsJson(req)) {
    return NextResponse.json({
      ok: true,
      needsConfirmation: !provisioned.emailConfirmed,
    });
  }

  const url = new URL("/login", req.url);
  if (provisioned.emailConfirmed) {
    url.searchParams.set("verified", "1");
  } else {
    url.searchParams.set("check-email", "1");
  }
  url.searchParams.set("email", email);
  return NextResponse.redirect(url, { status: 303 });
}

function wantsJson(req: Request): boolean {
  return req.headers.get("accept")?.includes("application/json") ?? false;
}

function signupErrorStatus(
  code: Exclude<
    Awaited<ReturnType<typeof completeEmailSignup>>,
    { ok: true }
  >["code"],
): number {
  switch (code) {
    case "exists":
      return 409;
    case "incomplete_signup":
      return 409;
    case "db_not_configured":
      return 503;
    case "profile_create_failed":
      return 500;
    case "facility_create_failed":
      return 500;
    case "create_user_failed":
    default:
      return 400;
  }
}

function signupErrorQuery(
  code: Exclude<
    Awaited<ReturnType<typeof completeEmailSignup>>,
    { ok: true }
  >["code"],
): string {
  switch (code) {
    case "exists":
      return "exists";
    case "incomplete_signup":
      return "incomplete_signup";
    case "db_not_configured":
      return "db_not_configured";
    case "profile_create_failed":
      return "profile";
    case "facility_create_failed":
      return "profile";
    case "create_user_failed":
    default:
      return "server";
  }
}

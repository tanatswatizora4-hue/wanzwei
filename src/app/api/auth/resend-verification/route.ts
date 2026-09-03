import { NextResponse } from "next/server";

import { resendVerificationEmail } from "@/lib/auth/email";
import { signupCheckEmailLocation } from "@/lib/auth/signup-session";
import {
  addRateLimitHeaders,
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimitKeyFromRequest,
} from "@/lib/rate-limit";
import { createLogger, withRouteLogging } from "@/lib/observability/logger";
import { VerificationEmailRequestSchema } from "@/lib/validation/auth";
import { validationErrorResponse } from "@/lib/validation/errors";

export const runtime = "nodejs";

const logger = createLogger("auth");

export async function POST(req: Request) {
  return withRouteLogging("/api/auth/resend-verification", req, () =>
    handlePOST(req),
  );
}

async function handlePOST(req: Request) {
  const payload = await readPayload(req);
  const rawEmail = payload.get("email");
  const rateLimit = await checkRateLimit(
    "verificationEmail",
    rateLimitKeyFromRequest(req, typeof rawEmail === "string" ? rawEmail : ""),
  );

  if (!rateLimit.success) {
    logger.warn("auth.verification_resend_failed", {
      reason: "rate_limited",
      email: typeof rawEmail === "string" ? rawEmail : undefined,
    });
    if (wantsJson(req)) {
      return rateLimitJsonResponse(rateLimit);
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "rate_limited");
    return addRateLimitHeaders(
      NextResponse.redirect(url, { status: 303 }),
      rateLimit,
    );
  }

  const parsed = VerificationEmailRequestSchema.safeParse({
    email: rawEmail,
  });

  if (!parsed.success) {
    logger.warn("auth.verification_resend_failed", {
      reason: "validation_failed",
      email: typeof rawEmail === "string" ? rawEmail : undefined,
    });
    if (wantsJson(req)) {
      return validationErrorResponse(parsed.error);
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "invalid_email");
    return NextResponse.redirect(url, { status: 303 });
  }

  await resendVerificationEmail(parsed.data.email, req.url);

  if (wantsJson(req)) {
    return NextResponse.json({ ok: true });
  }

  const rawNext = payload.get("next");
  if (
    typeof rawNext === "string" &&
    (rawNext === "/signup/check-email" ||
      rawNext.startsWith("/signup/check-email?"))
  ) {
    const url = new URL(signupCheckEmailLocation(parsed.data.email), req.url);
    url.searchParams.set("sent", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  const url = new URL("/login", req.url);
  url.searchParams.set("verification-email", "1");
  url.searchParams.set("email", parsed.data.email);
  return NextResponse.redirect(url, { status: 303 });
}

async function readPayload(req: Request): Promise<FormData> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as Record<string, unknown>;
    const formData = new FormData();
    if (typeof body.email === "string") {
      formData.set("email", body.email);
    }
    return formData;
  }

  return req.formData();
}

function wantsJson(req: Request): boolean {
  return req.headers.get("accept")?.includes("application/json") ?? false;
}

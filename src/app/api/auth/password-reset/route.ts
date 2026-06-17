import { NextResponse } from "next/server";

import { requestPasswordResetEmail } from "@/lib/auth/email";
import {
  addRateLimitHeaders,
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimitKeyFromRequest,
} from "@/lib/rate-limit";
import { createLogger, withRouteLogging } from "@/lib/observability/logger";
import { PasswordResetRequestSchema } from "@/lib/validation/auth";
import { validationErrorResponse } from "@/lib/validation/errors";

export const runtime = "nodejs";

const logger = createLogger("auth");

export async function POST(req: Request) {
  return withRouteLogging("/api/auth/password-reset", req, () =>
    handlePOST(req),
  );
}

async function handlePOST(req: Request) {
  const payload = await readPayload(req);
  const rawEmail = payload.get("email");
  const rateLimit = await checkRateLimit(
    "passwordReset",
    rateLimitKeyFromRequest(req, typeof rawEmail === "string" ? rawEmail : ""),
  );

  if (!rateLimit.success) {
    logger.warn("auth.password_reset_failed", {
      reason: "rate_limited",
      email: typeof rawEmail === "string" ? rawEmail : undefined,
    });
    if (wantsJson(req)) {
      return rateLimitJsonResponse(rateLimit);
    }
    const url = new URL("/forgot-password", req.url);
    url.searchParams.set("error", "rate_limited");
    return addRateLimitHeaders(
      NextResponse.redirect(url, { status: 303 }),
      rateLimit,
    );
  }

  const parsed = PasswordResetRequestSchema.safeParse({
    email: rawEmail,
  });

  if (!parsed.success) {
    logger.warn("auth.password_reset_failed", {
      reason: "validation_failed",
      email: typeof rawEmail === "string" ? rawEmail : undefined,
    });
    if (wantsJson(req)) {
      return validationErrorResponse(parsed.error);
    }
    const url = new URL("/forgot-password", req.url);
    url.searchParams.set("error", "invalid_email");
    return NextResponse.redirect(url, { status: 303 });
  }

  await requestPasswordResetEmail(parsed.data.email, req.url);

  if (wantsJson(req)) {
    return NextResponse.json({ ok: true });
  }

  const url = new URL("/login", req.url);
  url.searchParams.set("reset-email", "1");
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

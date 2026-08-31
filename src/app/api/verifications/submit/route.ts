import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { hasDbConfig } from "@/lib/db/client";
import { createLogger, withRouteLogging } from "@/lib/observability/logger";
import { validationErrorResponse } from "@/lib/validation/errors";
import { SubmitVerificationSchema } from "@/lib/validation/verifications";
import { SubmitVerificationError, submitProfessionalVerification } from "@/lib/verification/submit";
import {
  latestSubmissionMessage,
  publicStateFromVerification,
} from "@/lib/verification/public-result";

export const runtime = "nodejs";

const logger = createLogger("verification-submit");

export async function POST(req: Request) {
  return withRouteLogging("/api/verifications/submit", req, () => handlePOST(req));
}

async function handlePOST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "professional") {
    return NextResponse.json(
      { error: "Only professionals can submit verification credentials." },
      { status: 403 },
    );
  }

  if (!hasDbConfig()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const parsed = SubmitVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  try {
    const result = await submitProfessionalVerification(user, parsed.data);
    const status = publicStateFromVerification(result.verification);
    logger.info("verification.submitted", {
      userId: user.id,
      status,
      reusedExisting: result.reusedExisting,
    });
    return NextResponse.json({
      ok: true,
      status,
      message: latestSubmissionMessage(result.userVerified, status),
      reusedExisting: result.reusedExisting,
    });
  } catch (error) {
    if (error instanceof SubmitVerificationError) {
      const http =
        error.code === "forbidden_role"
          ? 403
          : error.code === "db_not_configured"
            ? 503
            : 400;
      return NextResponse.json({ error: error.message }, { status: http });
    }
    throw error;
  }
}

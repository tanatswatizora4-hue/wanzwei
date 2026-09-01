import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { withRouteLogging, createLogger } from "@/lib/observability/logger";
import { sendVerificationDecisionEmail } from "@/lib/email/notifications";
import { findUserById } from "@/lib/repos/users";
import { applyAdminVerificationDecision } from "@/lib/verification/admin-decision";

const logger = createLogger("admin-verification-decision");

const DECISIONS = ["Verified", "Rejected", "Under Review"] as const;
type DecisionStatus = (typeof DECISIONS)[number];

function isDecisionStatus(value: unknown): value is DecisionStatus {
  return DECISIONS.some((status) => status === value);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ verificationId: string }> },
) {
  const { verificationId } = await context.params;
  return withRouteLogging(
    `/api/admin/verifications/${verificationId}/decision`,
    req,
    () => handlePost(verificationId, req),
  );
}

async function handlePost(verificationId: string, req: Request) {
  const admin = await requireRole(["admin"]);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("status" in body)) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const payload = body as { status?: unknown; reason?: unknown };
  if (!isDecisionStatus(payload.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const status = payload.status;
  const reason =
    typeof payload.reason === "string" ? payload.reason.trim().slice(0, 500) : undefined;

  const updated = await applyAdminVerificationDecision(
    admin,
    verificationId,
    status,
    undefined,
    reason ? { reason } : undefined,
  );

  if (!updated) {
    return NextResponse.json(
      { error: "Verification not found" },
      { status: 404 },
    );
  }

  logger.info("admin.verification_status_updated", {
    verificationId,
    status: updated.verification.status,
  });

  try {
    const account = await findUserById(updated.verification.userId);
    if (account?.email) {
      const result = await sendVerificationDecisionEmail({
        to: account.email,
        professionalName: account.name,
        status,
      });
      if (!result.sent && !result.skipped) {
        logger.error("admin.verification_decision_email_failed", result.error, {
          verificationId,
          status,
        });
      }
    }
  } catch (error) {
    logger.error("admin.verification_decision_email_failed", error, {
      verificationId,
      status,
    });
  }

  return NextResponse.json({ ok: true, verification: updated.verification });
}

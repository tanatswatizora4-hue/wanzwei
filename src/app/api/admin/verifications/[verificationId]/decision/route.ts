import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { withRouteLogging, createLogger } from "@/lib/observability/logger";
import { applyAdminVerificationDecision } from "@/lib/verification/admin-decision";

const logger = createLogger("admin-verification-decision");

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

  const payload = body as { status?: unknown };
  if (payload.status !== "Verified" && payload.status !== "Rejected") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const status = payload.status as "Verified" | "Rejected";

  const updated = await applyAdminVerificationDecision(
    admin,
    verificationId,
    status,
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

  return NextResponse.json({ ok: true, verification: updated.verification });
}

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { withRouteLogging, createLogger } from "@/lib/observability/logger";
import { createSignedStorageUrl, PRIVATE_DOCUMENTS_BUCKET } from "@/lib/supabase/private-storage";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import { listVerificationDocuments } from "@/lib/repos/verifications";

const logger = createLogger("admin-verification-documents");

export async function GET(
  req: Request,
  context: { params: Promise<{ verificationId: string }> },
) {
  const { verificationId } = await context.params;
  return withRouteLogging(
    `/api/admin/verifications/${verificationId}/documents`,
    req,
    () => handleGet(verificationId),
  );
}

async function handleGet(verificationId: string) {
  await requireRole(["admin"]);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ documents: [], configured: false });
  }

  const documents = await listVerificationDocuments(verificationId);

  const signed = await Promise.all(
    documents.map(async (doc) => {
      const bucket = doc.storageBucket || PRIVATE_DOCUMENTS_BUCKET;
      const signedUrl = await createSignedStorageUrl(doc.storagePath, {
        bucket,
      });

      return {
        id: doc.id,
        file_name: doc.fileName,
        content_type: doc.contentType ?? "",
        public_url: signedUrl,
        uploaded_at: doc.uploadedAt.toISOString(),
      };
    }),
  );

  logger.info("admin.verification_documents_listed", {
    verificationId,
    count: signed.length,
  });

  return NextResponse.json({ configured: true, documents: signed });
}


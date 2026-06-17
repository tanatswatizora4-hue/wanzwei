import { NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { checkRateLimit, rateLimitJsonResponse } from "@/lib/rate-limit";
import {
  DOCUMENTS_BUCKET,
  sanitizeStorageFileName,
  validateDocumentFile,
} from "@/lib/upload-rules";
import {
  createUploadClient,
  isSupabaseConfigured,
} from "@/lib/supabase/service";
import {
  withSignedDocumentUrl,
  withSignedDocumentUrls,
} from "@/lib/supabase/private-storage";
import { isMissingTableError, toRepositoryError } from "@/lib/supabase/errors";
import {
  fieldValidationErrorResponse,
  validationErrorResponse,
} from "@/lib/validation/errors";
import { DocumentUploadSchema } from "@/lib/validation/uploads";
import { createLogger, logException, withRouteLogging } from "@/lib/observability/logger";

export const runtime = "nodejs";

const logger = createLogger("uploads");

export async function GET(req: Request) {
  return withRouteLogging("/api/uploads/professional", req, handleGET);
}

async function handleGET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ documents: [], configured: false });
  }
  const user = await getCurrentUserWithRole(["professional"]);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const supabase = createUploadClient();
    const { data, error } = await supabase
      .from("professional_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      if (isMissingTableError(error)) {
        logger.warn("upload.professional_schema_missing", {
          table: "professional_documents",
        });
        return NextResponse.json({ documents: [], configured: true });
      }
      throw toRepositoryError(error);
    }
    return NextResponse.json({
      configured: true,
      documents: await withSignedDocumentUrls(data ?? [], supabase),
    });
  } catch (e) {
    logException("uploads", "upload.professional_list_failed", e, {
      userId: user.id,
    });
    return NextResponse.json({ error: "Failed to list documents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return withRouteLogging("/api/uploads/professional", req, () => handlePOST(req));
}

async function handlePOST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 },
    );
  }
  const user = await getCurrentUserWithRole(["professional"]);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rateLimit = await checkRateLimit("upload", `professional:${user.id}`);
  if (!rateLimit.success) {
    return rateLimitJsonResponse(rateLimit);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart body" }, { status: 400 });
  }

  const parsed = DocumentUploadSchema.safeParse({
    file: formData.get("file"),
  });
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const { file } = parsed.data;

  const buffer = Buffer.from(await file.arrayBuffer());
  const validationMessage = validateDocumentFile(file, buffer);
  if (validationMessage) {
    return fieldValidationErrorResponse("file", validationMessage);
  }

  const supabase = createUploadClient();
  const safeName = sanitizeStorageFileName(file.name);
  const objectPath = `professional/${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    logger.error("upload.professional_upload_failed", uploadError, {
      userId: user.id,
      contentType: file.type,
      size: file.size,
    });
    return NextResponse.json(
      { error: uploadError.message || "Upload failed" },
      { status: 500 },
    );
  }

  const { data: row, error: insertError } = await supabase
    .from("professional_documents")
    .insert({
      user_id: user.id,
      storage_path: objectPath,
      public_url: "",
      file_name: file.name,
      content_type: file.type,
    })
    .select("*")
    .single();

  if (insertError) {
    logger.error("upload.professional_metadata_failed", insertError, {
      userId: user.id,
      contentType: file.type,
      size: file.size,
    });
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([objectPath]);
    return NextResponse.json(
      {
        error: insertError.message || "Failed to save metadata",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    document: await withSignedDocumentUrl(row, supabase),
  });
}

export async function DELETE(req: Request) {
  return withRouteLogging(
    "/api/uploads/professional",
    req,
    () => handleDELETE(req),
  );
}

async function handleDELETE(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 },
    );
  }

  const user = await getCurrentUserWithRole(["professional"]);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(
    "upload",
    `professional:delete:${user.id}`,
  );
  if (!rateLimit.success) {
    return rateLimitJsonResponse(rateLimit);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const payload = body as { documentId?: unknown } | null;
  if (!payload || typeof payload.documentId !== "string") {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 },
    );
  }

  const documentId = payload.documentId;

  const supabase = createUploadClient();
  const { data: row, error: selectError } = await supabase
    .from("professional_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    if (isMissingTableError(selectError)) {
      return NextResponse.json(
        { error: "Documents table missing" },
        { status: 500 },
      );
    }
    throw toRepositoryError(selectError);
  }
  if (!row) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([row.storage_path]);

  if (storageError) {
    logger.error("upload.professional_delete_storage_failed", storageError, {
      userId: user.id,
      documentId,
      storagePath: row.storage_path,
    });
    return NextResponse.json(
      { error: storageError.message || "Failed to delete file" },
      { status: 500 },
    );
  }

  const { error: deleteError } = await supabase
    .from("professional_documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", user.id);

  if (deleteError) {
    logger.error("upload.professional_delete_metadata_failed", deleteError, {
      userId: user.id,
      documentId,
    });
    return NextResponse.json(
      { error: deleteError.message || "Failed to delete metadata" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

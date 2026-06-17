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
import { resolveFacilityIdForUser } from "@/lib/facility-for-user";
import {
  fieldValidationErrorResponse,
  validationErrorResponse,
} from "@/lib/validation/errors";
import { DocumentUploadSchema } from "@/lib/validation/uploads";
import { createLogger, logException, withRouteLogging } from "@/lib/observability/logger";

export const runtime = "nodejs";

const logger = createLogger("uploads");

export async function GET(req: Request) {
  return withRouteLogging("/api/uploads/facility-verification", req, handleGET);
}

async function handleGET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ documents: [], configured: false });
  }
  const user = await getCurrentUserWithRole(["facility"]);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const facilityId = await resolveFacilityIdForUser(user);
  if (!facilityId) {
    return NextResponse.json(
      { error: "Facility profile is not linked to this user." },
      { status: 409 },
    );
  }
  try {
    const supabase = createUploadClient();
    const { data, error } = await supabase
      .from("facility_verification_documents")
      .select("*")
      .eq("facility_id", facilityId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({
      configured: true,
      documents: await withSignedDocumentUrls(data ?? [], supabase),
    });
  } catch (e) {
    logException("uploads", "upload.facility_list_failed", e, {
      userId: user.id,
      facilityId,
    });
    return NextResponse.json({ error: "Failed to list documents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return withRouteLogging("/api/uploads/facility-verification", req, () =>
    handlePOST(req),
  );
}

async function handlePOST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 },
    );
  }
  const user = await getCurrentUserWithRole(["facility"]);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rateLimit = await checkRateLimit("upload", `facility:${user.id}`);
  if (!rateLimit.success) {
    return rateLimitJsonResponse(rateLimit);
  }

  const facilityId = await resolveFacilityIdForUser(user);
  if (!facilityId) {
    return NextResponse.json(
      { error: "Facility profile is not linked to this user." },
      { status: 409 },
    );
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
  const objectPath = `facility/${facilityId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    logger.error("upload.facility_upload_failed", uploadError, {
      userId: user.id,
      facilityId,
      contentType: file.type,
      size: file.size,
    });
    return NextResponse.json(
      { error: uploadError.message || "Upload failed" },
      { status: 500 },
    );
  }

  const { data: row, error: insertError } = await supabase
    .from("facility_verification_documents")
    .insert({
      user_id: user.id,
      facility_id: facilityId,
      storage_path: objectPath,
      public_url: "",
      file_name: file.name,
      content_type: file.type,
    })
    .select("*")
    .single();

  if (insertError) {
    logger.error("upload.facility_metadata_failed", insertError, {
      userId: user.id,
      facilityId,
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

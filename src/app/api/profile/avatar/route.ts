import { NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { updateUser } from "@/lib/repos/users";
import { checkRateLimit, rateLimitJsonResponse } from "@/lib/rate-limit";
import {
  DOCUMENTS_BUCKET,
  sanitizeStorageFileName,
  validateProfilePhotoFile,
} from "@/lib/upload-rules";
import {
  createUploadClient,
  isSupabaseConfigured,
} from "@/lib/supabase/service";
import { createSignedStorageUrl } from "@/lib/supabase/private-storage";
import {
  fieldValidationErrorResponse,
  validationErrorResponse,
} from "@/lib/validation/errors";
import { AvatarProfilePatchSchema } from "@/lib/validation/profile";
import { ProfileAvatarUploadSchema } from "@/lib/validation/uploads";
import { createLogger, withRouteLogging } from "@/lib/observability/logger";

export const runtime = "nodejs";

const logger = createLogger("uploads");

export async function POST(req: Request) {
  return withRouteLogging("/api/profile/avatar", req, () => handlePOST(req));
}

async function handlePOST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 },
    );
  }

  const user = await getCurrentUserWithRole([
    "professional",
    "facility",
    "admin",
  ]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit("upload", `avatar:${user.id}`);
  if (!rateLimit.success) {
    return rateLimitJsonResponse(rateLimit);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart body" }, { status: 400 });
  }

  const parsed = ProfileAvatarUploadSchema.safeParse({
    file: formData.get("file"),
  });
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const { file } = parsed.data;

  const buffer = Buffer.from(await file.arrayBuffer());
  const validationMessage = validateProfilePhotoFile(file, buffer);
  if (validationMessage) {
    return fieldValidationErrorResponse("file", validationMessage);
  }

  const supabase = createUploadClient();
  const safeName = sanitizeStorageFileName(file.name);
  const objectPath = `avatars/${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    logger.error("upload.avatar_upload_failed", uploadError, {
      userId: user.id,
      contentType: file.type,
      size: file.size,
    });
    return NextResponse.json(
      { error: uploadError.message || "Upload failed" },
      { status: 500 },
    );
  }

  const patch = AvatarProfilePatchSchema.parse({ avatar: objectPath });
  const updated = await updateUser(user.id, { avatarUrl: patch.avatar });
  if (!updated) {
    logger.error("upload.avatar_profile_update_failed", new Error("User not found"), {
      userId: user.id,
    });
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([objectPath]);
    return NextResponse.json({ error: "User not found" }, { status: 500 });
  }

  return NextResponse.json({
    avatarUrl: await createSignedStorageUrl(objectPath, { supabase }),
  });
}

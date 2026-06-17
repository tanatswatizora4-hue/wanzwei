import { z } from "zod";

import {
  ALLOWED_DOCUMENT_MIME,
  ALLOWED_EXTENSIONS,
  ALLOWED_PROFILE_PHOTO_MIME,
  MAX_DOCUMENT_BYTES,
  MAX_PROFILE_PHOTO_BYTES,
} from "@/lib/upload-rules";

const uploadedFileSchema = z.instanceof(File, {
  message: "Missing file",
});

export const ProfileAvatarUploadSchema = z.object({
  file: uploadedFileSchema
    .refine((file) => file.size > 0, "Missing file")
    .refine(
      (file) => ALLOWED_PROFILE_PHOTO_MIME.has(file.type),
      "Profile photos must be JPG or PNG.",
    )
    .refine(
      (file) => /\.(jpe?g|png)$/i.test(file.name),
      "Use a .jpg, .jpeg, or .png file.",
    )
    .refine(
      (file) => file.size <= MAX_PROFILE_PHOTO_BYTES,
      "Photo is too large (max 5 MB).",
    ),
});

export const DocumentUploadSchema = z.object({
  file: uploadedFileSchema
    .refine((file) => file.size > 0, "Missing file")
    .refine(
      (file) => ALLOWED_DOCUMENT_MIME.has(file.type),
      "Only PDF, JPG, or PNG files are allowed.",
    )
    .refine(
      (file) => ALLOWED_EXTENSIONS.test(file.name),
      "File name must end with .pdf, .jpg, .jpeg, or .png.",
    )
    .refine(
      (file) => file.size <= MAX_DOCUMENT_BYTES,
      "File is too large (max 15 MB).",
    ),
});

export type ProfileAvatarUploadInput = z.infer<
  typeof ProfileAvatarUploadSchema
>;
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;

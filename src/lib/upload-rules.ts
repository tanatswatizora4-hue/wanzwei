/** Allowed uploads for credential / verification flows. */

export const DOCUMENTS_BUCKET = "documents";

export const ALLOWED_DOCUMENT_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

/** Profile photos: images only, tighter size cap. */
export const ALLOWED_PROFILE_PHOTO_MIME = new Set(["image/jpeg", "image/png"]);

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;

export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

type AllowedKind = "pdf" | "jpeg" | "png";

const EXTENSION_TO_KIND: Record<string, AllowedKind> = {
  pdf: "pdf",
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
};

const MIME_TO_KIND = new Map<string, AllowedKind>([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpeg"],
  ["image/png", "png"],
]);

export function sanitizeStorageFileName(original: string): string {
  const trimmed = original.trim().slice(0, 180);
  const safe = trimmed
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "");
  return safe || "document";
}

export function validateProfilePhotoFile(
  file: File,
  bytes?: Uint8Array,
): string | null {
  if (!ALLOWED_PROFILE_PHOTO_MIME.has(file.type)) {
    return "Profile photos must be JPG or PNG.";
  }
  const extensionKind = kindFromExtension(file.name);
  if (extensionKind !== "jpeg" && extensionKind !== "png") {
    return "Use a .jpg, .jpeg, or .png file.";
  }
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    return "Photo is too large (max 5 MB).";
  }
  const contentMessage = validateFileContent(file, extensionKind, bytes);
  if (contentMessage) return contentMessage;
  return null;
}

export function validateDocumentFile(file: File, bytes?: Uint8Array): string | null {
  if (!ALLOWED_DOCUMENT_MIME.has(file.type)) {
    return "Only PDF, JPG, or PNG files are allowed.";
  }
  const extensionKind = kindFromExtension(file.name);
  if (!extensionKind || !ALLOWED_EXTENSIONS.test(file.name)) {
    return "File name must end with .pdf, .jpg, .jpeg, or .png.";
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return "File is too large (max 15 MB).";
  }
  const contentMessage = validateFileContent(file, extensionKind, bytes);
  if (contentMessage) return contentMessage;
  return null;
}

function validateFileContent(
  file: File,
  extensionKind: AllowedKind,
  bytes?: Uint8Array,
): string | null {
  const mimeKind = MIME_TO_KIND.get(file.type);
  if (!mimeKind || mimeKind !== extensionKind) {
    return "File extension and MIME type do not match.";
  }
  if (!bytes) return null;

  const magicKind = kindFromMagicBytes(bytes);
  if (!magicKind || magicKind !== extensionKind) {
    return "File contents do not match the declared file type.";
  }
  return null;
}

function kindFromExtension(fileName: string): AllowedKind | null {
  const extension = fileName.trim().split(".").pop()?.toLowerCase();
  return extension ? (EXTENSION_TO_KIND[extension] ?? null) : null;
}

function kindFromMagicBytes(bytes: Uint8Array): AllowedKind | null {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "pdf";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  return null;
}

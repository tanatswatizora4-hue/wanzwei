import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createLogger } from "@/lib/observability/logger";
import { DOCUMENTS_BUCKET } from "@/lib/upload-rules";
import { createUploadClient, isSupabaseConfigured } from "./service";

export const PRIVATE_DOCUMENTS_BUCKET = DOCUMENTS_BUCKET;
export const SIGNED_URL_EXPIRES_IN_SECONDS = 10 * 60;
const logger = createLogger("storage");

type StoragePathRow = {
  storage_path: string;
  public_url: string;
};

export async function createSignedStorageUrl(
  storagePath: string | null | undefined,
  options: {
    bucket?: string;
    expiresInSeconds?: number;
    supabase?: SupabaseClient;
  } = {},
): Promise<string> {
  const bucket = options.bucket ?? PRIVATE_DOCUMENTS_BUCKET;
  const path = resolvePrivateStoragePath(storagePath, bucket);
  if (!path || !isSupabaseConfigured()) return "";

  const supabase = options.supabase ?? createUploadClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, options.expiresInSeconds ?? SIGNED_URL_EXPIRES_IN_SECONDS);

  if (error) {
    logger.error("storage.signed_url_failed", error, { bucket });
    return "";
  }
  return data.signedUrl;
}

export async function createSignedAvatarUrl(
  avatarStoragePath: string | null | undefined,
): Promise<string | null> {
  const signedUrl = await createSignedStorageUrl(avatarStoragePath);
  return signedUrl || null;
}

export async function withSignedDocumentUrl<T extends StoragePathRow>(
  row: T,
  supabase?: SupabaseClient,
): Promise<T> {
  return {
    ...row,
    public_url: await createSignedStorageUrl(row.storage_path, { supabase }),
  };
}

export async function withSignedDocumentUrls<T extends StoragePathRow>(
  rows: T[],
  supabase?: SupabaseClient,
): Promise<T[]> {
  return Promise.all(rows.map((row) => withSignedDocumentUrl(row, supabase)));
}

export function resolvePrivateStoragePath(
  storedValue: string | null | undefined,
  bucket = PRIVATE_DOCUMENTS_BUCKET,
): string | null {
  const value = storedValue?.trim();
  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    return value.includes("/") ? value.replace(/^\/+/, "") : null;
  }

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const bucketIndex = parts.findIndex((part) => part === bucket);
    if (bucketIndex === -1 || bucketIndex === parts.length - 1) return null;
    return parts.slice(bucketIndex + 1).join("/");
  } catch {
    return null;
  }
}

import { DOCUMENTS_BUCKET } from "@/lib/upload-rules";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createUploadClient,
  isSupabaseConfigured,
} from "@/lib/supabase/service";
import type { DocumentAnalyzerInput } from "@/lib/verification/hybrid-types";

export async function loadOwnedDocumentForAnalysis(
  userId: string,
  documentId: string,
): Promise<DocumentAnalyzerInput | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createUploadClient();
  const { data, error } = await supabase
    .from("professional_documents")
    .select("storage_path, content_type")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    return null;
  }
  if (!data?.storage_path) return null;
  const downloaded = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(data.storage_path);
  if (downloaded.error || !downloaded.data) return null;
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  return {
    storagePath: data.storage_path,
    contentType: data.content_type || "application/octet-stream",
    bytes,
  };
}

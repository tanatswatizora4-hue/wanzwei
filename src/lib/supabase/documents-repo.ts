import { createUploadClient, isSupabaseConfigured } from "./service";
import { withSignedDocumentUrls } from "./private-storage";
import { createLogger, withRepositoryLogging } from "@/lib/observability/logger";
import { isMissingTableError, isUndefinedColumnError, toRepositoryError } from "./errors";
import type {
  FacilityVerificationDocumentRow,
  ProfessionalDocumentRow,
} from "./document-types";
import type { ProfessionalDocumentPurpose } from "@/lib/verification/document-purpose";

const logger = createLogger("documents");

export async function listProfessionalDocuments(
  userId: string,
  options?: { purpose?: ProfessionalDocumentPurpose },
): Promise<ProfessionalDocumentRow[]> {
  if (!isSupabaseConfigured()) return [];
  return withRepositoryLogging(
    "documents",
    "listProfessionalDocuments",
    async () => {
      const supabase = createUploadClient();
      let query = supabase
        .from("professional_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (options?.purpose) {
        query = query.eq("purpose", options.purpose);
      }
      let { data, error } = await query;
      if (error && options?.purpose && isUndefinedColumnError(error)) {
        const fallback = await supabase
          .from("professional_documents")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }
      if (error) {
        if (isMissingTableError(error)) {
          logger.warn("documents.schema_missing", {
            table: "professional_documents",
            hint: "Run supabase/sql/documents.sql or migration 0004 in the Supabase SQL editor.",
          });
          return [];
        }
        throw toRepositoryError(error);
      }
      return withSignedDocumentUrls(
        (data ?? []) as ProfessionalDocumentRow[],
        supabase,
      );
    },
    { userId },
  );
}

export async function listFacilityVerificationDocuments(
  facilityId: string,
  userId: string,
): Promise<FacilityVerificationDocumentRow[]> {
  if (!isSupabaseConfigured()) return [];
  return withRepositoryLogging(
    "documents",
    "listFacilityVerificationDocuments",
    async () => {
      const supabase = createUploadClient();
      const { data, error } = await supabase
        .from("facility_verification_documents")
        .select("*")
        .eq("facility_id", facilityId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        if (isMissingTableError(error)) {
          logger.warn("documents.schema_missing", {
            table: "facility_verification_documents",
            hint: "Run supabase/sql/documents.sql or migration 0004 in the Supabase SQL editor.",
          });
          return [];
        }
        throw toRepositoryError(error);
      }
      return withSignedDocumentUrls(
        (data ?? []) as FacilityVerificationDocumentRow[],
        supabase,
      );
    },
    { facilityId, userId },
  );
}

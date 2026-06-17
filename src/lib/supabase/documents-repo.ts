import { createUploadClient, isSupabaseConfigured } from "./service";
import { withSignedDocumentUrls } from "./private-storage";
import { createLogger, withRepositoryLogging } from "@/lib/observability/logger";
import { isMissingTableError, toRepositoryError } from "./errors";
import type {
  FacilityVerificationDocumentRow,
  ProfessionalDocumentRow,
} from "./document-types";

const logger = createLogger("documents");

export async function listProfessionalDocuments(
  userId: string,
): Promise<ProfessionalDocumentRow[]> {
  if (!isSupabaseConfigured()) return [];
  return withRepositoryLogging(
    "documents",
    "listProfessionalDocuments",
    async () => {
      const supabase = createUploadClient();
      const { data, error } = await supabase
        .from("professional_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
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

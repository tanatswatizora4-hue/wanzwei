export type HybridDecision =
  | "pending_documents"
  | "processing"
  | "verified"
  | "additional_evidence_required"
  | "manual_review"
  | "rejected";

export type AnalysisStatus = "unavailable" | "processed" | "unreadable";

export type NameMatch = "match" | "mismatch" | "unknown";
export type ProfessionMatch = "compatible" | "incompatible" | "unknown";
export type ExpiryCheck = "current" | "expired" | "unknown";
export type ExtractionQuality = "high" | "medium" | "poor" | "unknown";
export type CredentialClass =
  | "current_authorization"
  | "qualification"
  | "unknown";

export type RegistryEvidenceOutcome =
  | "MATCH"
  | "NOT_FOUND"
  | "CONTRADICTION"
  | "UNAVAILABLE_FOR_PROFESSION"
  | "NOT_SUBMITTED";

export type DocumentAnalyzerInput = {
  storagePath: string;
  contentType: string;
  bytes?: Uint8Array;
};

export type IdentityAnalysis = {
  status: AnalysisStatus;
  identityName?: string | null;
  givenNames?: string | null;
  surname?: string | null;
  identityDocumentType?: "national_id" | "passport" | "unknown" | null;
  nationality?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  issuingAuthority?: string | null;
  identityNumberPresent?: boolean;
  documentQuality?: "readable" | "poor" | "unknown";
  extractionQuality?: ExtractionQuality;
  /** Model confidence 0–1. Never a verification grant by itself. */
  confidence?: number | null;
  fraudFlags?: string[];
};

export type CredentialAnalysis = {
  status: AnalysisStatus;
  credentialName?: string | null;
  credentialType?: string | null;
  credentialClass?: CredentialClass;
  detectedProfession?: string | null;
  qualification?: string | null;
  institution?: string | null;
  registrationNumber?: string | null;
  issuingBody?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  currentStatus?: string | null;
  documentQuality?: "readable" | "poor" | "unknown";
  extractionQuality?: ExtractionQuality;
  /** Model confidence 0–1. Never a verification grant by itself. */
  confidence?: number | null;
  fraudFlags?: string[];
};

export type RegistryEvidence = {
  outcome: RegistryEvidenceOutcome;
  registryAvailable: boolean;
  registryNameMatch: boolean | null;
  registryProfessionMatch: boolean | null;
  matchedRegistryId: string | null;
  reason: string;
};

export type HybridDecisionInput = {
  hasIdentityDocument: boolean;
  hasCredentialDocument: boolean;
  submittedName: string;
  submittedProfession: string;
  submittedRegulatoryBody?: string | null;
  regulatoryBodyOther?: string | null;
  identity: IdentityAnalysis;
  credential: CredentialAnalysis;
  registry: RegistryEvidence;
};

export type HybridDecisionResult = {
  decision: HybridDecision;
  decisionReason: string;
  verificationMethod: "hybrid" | "registry_assisted" | "manual";
  reviewRequired: boolean;
  nameMatch: NameMatch;
  professionMatch: ProfessionMatch;
  expiryCheck: ExpiryCheck;
  analysisStatus: AnalysisStatus;
};

export type IdentityDocumentAnalyzer = {
  analyze(input: DocumentAnalyzerInput): Promise<IdentityAnalysis>;
};

export type CredentialDocumentAnalyzer = {
  analyze(input: DocumentAnalyzerInput): Promise<CredentialAnalysis>;
};

export type RegistryEvidenceProvider = {
  evaluate(input: {
    submittedName: string;
    submittedProfession: string;
    registeringBody?: string | null;
    registrationNumber?: string | null;
  }): Promise<RegistryEvidence>;
};

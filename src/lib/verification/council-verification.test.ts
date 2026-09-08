import { describe, expect, it } from "vitest";

import { decideHybridVerification } from "./decision-engine";
import { registryEvidenceFromMatch } from "./registry-evidence";
import type { HybridDecisionInput } from "./hybrid-types";
import { SubmitVerificationSchema } from "@/lib/validation/verifications";
import { SettingsProfileUpdateSchema } from "@/lib/validation/profile";
import { isVerifiedProfessional } from "@/lib/auth/professional-verification";
import { mapCredentialExtraction } from "@/lib/verification/gemini/map-response";
import { legacyVerifiedAccountRemainsVerified } from "./practising-certificate";

const DOCS = {
  identityDocumentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  credentialDocumentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
};

const PROCESSED_ID = {
  status: "processed" as const,
  identityName: "Tinashe Moyo",
  identityDocumentType: "national_id" as const,
  documentQuality: "readable" as const,
  extractionQuality: "high" as const,
};

const PROCESSED_CERT = {
  status: "processed" as const,
  credentialName: "Tinashe Moyo",
  credentialType: "practising_certificate",
  credentialClass: "current_authorization" as const,
  detectedProfession: "Pharmacist",
  expiryDate: "2099-01-01",
  documentQuality: "readable" as const,
  extractionQuality: "high" as const,
};

function base(overrides: Partial<HybridDecisionInput> = {}): HybridDecisionInput {
  return {
    hasIdentityDocument: true,
    hasCredentialDocument: true,
    submittedName: "Tinashe Moyo",
    submittedProfession: "Pharmacist",
    submittedRegulatoryBody: "PCZ",
    identity: PROCESSED_ID,
    credential: PROCESSED_CERT,
    registry: {
      outcome: "MATCH",
      registryAvailable: true,
      registryNameMatch: true,
      registryProfessionMatch: true,
      matchedRegistryId: "reg-1",
      reason: "Active unique registration matched.",
    },
    ...overrides,
  };
}

const MATCH_ROW = {
  id: "reg-1",
  registeringBody: "HPA",
  registrationNumberNormalized: "P0164202026",
  fullNameNormalized: "TINASHE MOYO",
  qualification: "PHARMACIST",
  qualificationNormalized: "PHARMACIST",
  expiryDate: "2027-02-28",
  isPlaceholder: false,
  licenceClass: "P01",
  licenceSerial: "6420",
};

describe("council-aware professional verification", () => {
  it("accepts an NCZ professional submission", () => {
    const parsed = SubmitVerificationSchema.parse({
      profession: "Nurse",
      registeringBody: "NCZ",
      registrationNumber: "N12-3456-2024",
      ...DOCS,
    });
    expect(parsed.registeringBody).toBe("NCZ");
    expect(parsed.profession).toBe("Nurse");
  });

  it("accepts an MDPCZ professional submission", () => {
    const parsed = SubmitVerificationSchema.parse({
      profession: "Medical Doctor (General Practitioner)",
      registeringBody: "MDPCZ",
      registrationNumber: "MD-1001",
      ...DOCS,
    });
    expect(parsed.registeringBody).toBe("MDPCZ");
  });

  it("accepts an AHPCZ professional submission", () => {
    const parsed = SubmitVerificationSchema.parse({
      profession: "Physiotherapist",
      registeringBody: "AHPCZ",
      registrationNumber: "AH-88",
      ...DOCS,
    });
    expect(parsed.registeringBody).toBe("AHPCZ");
  });

  it("requires a name when Other is selected", () => {
    expect(
      SubmitVerificationSchema.safeParse({
        profession: "Community Health Worker",
        registeringBody: "OTHER",
        registrationNumber: "CHW-1",
        ...DOCS,
      }).success,
    ).toBe(false);
    expect(
      SubmitVerificationSchema.parse({
        profession: "Community Health Worker",
        registeringBody: "OTHER",
        regulatoryBodyOther: "  Church health board  ",
        registrationNumber: "CHW-1",
        ...DOCS,
      }).regulatoryBodyOther,
    ).toBe("Church health board");
  });

  it("never auto-verifies Other", () => {
    const result = decideHybridVerification(
      base({
        submittedProfession: "Community Health Worker",
        submittedRegulatoryBody: "OTHER",
        regulatoryBodyOther: "Church health board",
        credential: {
          ...PROCESSED_CERT,
          detectedProfession: "Community Health Worker",
        },
        registry: {
          outcome: "UNAVAILABLE_FOR_PROFESSION",
          registryAvailable: false,
          registryNameMatch: null,
          registryProfessionMatch: null,
          matchedRegistryId: null,
          reason: "Other regulatory bodies are never treated as registry corroborated.",
        },
      }),
    );
    expect(result.decision).not.toBe("verified");
    expect(result.decision).toBe("manual_review");
    expect(result.verificationMethod).toBe("manual");
  });

  it("auto-verifies a supported registry MATCH", () => {
    const result = decideHybridVerification(base());
    expect(result.decision).toBe("verified");
    expect(result.verificationMethod).toBe("registry_assisted");
  });

  it("routes registry NOT_FOUND to review instead of automatic rejection", () => {
    const evidence = registryEvidenceFromMatch({
      submittedName: "Tinashe Moyo",
      submittedProfession: "Pharmacist",
      registeringBody: "PCZ",
      registrationNumber: "P01-6420-2026",
      rows: [],
    });
    expect(evidence.outcome).toBe("NOT_FOUND");
    const result = decideHybridVerification(
      base({ registry: evidence }),
    );
    expect(result.decision).toBe("manual_review");
    expect(result.decision).not.toBe("rejected");
    expect(result.decision).not.toBe("verified");
  });

  it("never auto-verifies a registry CONTRADICTION", () => {
    const result = decideHybridVerification(
      base({
        registry: {
          outcome: "CONTRADICTION",
          registryAvailable: true,
          registryNameMatch: false,
          registryProfessionMatch: true,
          matchedRegistryId: "reg-1",
          reason: "Submitted name does not match the registry record.",
        },
      }),
    );
    expect(result.decision).not.toBe("verified");
  });

  it("never auto-verifies a placeholder registry record", () => {
    const evidence = registryEvidenceFromMatch({
      submittedName: "Tinashe Moyo",
      submittedProfession: "Pharmacist",
      registeringBody: "PCZ",
      registrationNumber: "P03-0000-2026",
      rows: [
        {
          ...MATCH_ROW,
          isPlaceholder: true,
          registrationNumberNormalized: "P0300002026",
          licenceSerial: "0000",
        },
      ],
    });
    expect(evidence.outcome).not.toBe("MATCH");
    const result = decideHybridVerification(base({ registry: evidence }));
    expect(result.decision).not.toBe("verified");
  });

  it("treats a current practising certificate as current", () => {
    const result = decideHybridVerification(base());
    expect(result.expiryCheck).toBe("current");
  });

  it("does not auto-verify an expired practising certificate", () => {
    const result = decideHybridVerification(
      base({
        credential: { ...PROCESSED_CERT, expiryDate: "2020-01-01" },
      }),
    );
    expect(result.expiryCheck).toBe("expired");
    expect(result.decision).not.toBe("verified");
  });

  it("treats missing expiry as unable to confirm for auto-verify", () => {
    const result = decideHybridVerification(
      base({
        credential: { ...PROCESSED_CERT, expiryDate: undefined },
        registry: {
          outcome: "UNAVAILABLE_FOR_PROFESSION",
          registryAvailable: false,
          registryNameMatch: null,
          registryProfessionMatch: null,
          matchedRegistryId: null,
          reason: "No register.",
        },
        submittedProfession: "Physiotherapist",
        submittedRegulatoryBody: "AHPCZ",
      }),
    );
    expect(result.expiryCheck).toBe("unknown");
    expect(result.decision).not.toBe("verified");
  });

  it("does not let Gemini extraction directly verify", () => {
    const mapped = mapCredentialExtraction({
      holderName: "Tinashe Moyo",
      profession: "Pharmacist",
      credentialType: "practising_certificate",
      issuingBody: "PCZ",
      expiryDate: "2099-01-01",
      readability: "readable",
      extractionQuality: "high",
      confidence: 0.99,
      verified: true,
    });
    expect(mapped).not.toHaveProperty("verified");
    const result = decideHybridVerification(
      base({
        credential: { ...mapped, credentialClass: "current_authorization" },
        submittedRegulatoryBody: "OTHER",
        regulatoryBodyOther: "Invented council",
        registry: {
          outcome: "UNAVAILABLE_FOR_PROFESSION",
          registryAvailable: false,
          registryNameMatch: null,
          registryProfessionMatch: null,
          matchedRegistryId: null,
          reason: "Other.",
        },
      }),
    );
    expect(result.decision).not.toBe("verified");
  });

  it("fails closed when analysis is unavailable", () => {
    const result = decideHybridVerification(
      base({
        identity: { status: "unavailable" },
        credential: { status: "unavailable" },
      }),
    );
    expect(result.decision).toBe("processing");
    expect(result.decision).not.toBe("verified");
  });

  it("does not let a user self-set verification result", () => {
    expect(
      SettingsProfileUpdateSchema.safeParse({
        name: "Tinashe Moyo",
        verified: true,
      }).success,
    ).toBe(false);
    expect(
      SubmitVerificationSchema.safeParse({
        profession: "Pharmacist",
        registeringBody: "PCZ",
        registrationNumber: "P01-6420-2026",
        verified: true,
        ...DOCS,
      }).success,
    ).toBe(false);
  });

  it("does not let a user self-set certificate status", () => {
    expect(
      SettingsProfileUpdateSchema.safeParse({
        name: "Tinashe Moyo",
        practisingCertificateStatus: "current",
        practisingCertificateExpiry: "2099-01-01",
      }).success,
    ).toBe(false);
  });

  it("does not mass-deverify legacy verified users without new fields", () => {
    expect(
      legacyVerifiedAccountRemainsVerified({
        verified: true,
        practisingCertificateExpiry: null,
        practisingCertificateStatus: null,
      }),
    ).toBe(true);
  });

  it("still blocks unverified professionals from applying and emergency locums", () => {
    expect(
      isVerifiedProfessional({ role: "professional", verified: false }),
    ).toBe(false);
  });

  it("does not subject facility or admin roles to professional credential requirements", () => {
    expect(
      isVerifiedProfessional({ role: "facility", verified: true }),
    ).toBe(false);
    expect(
      isVerifiedProfessional({ role: "admin", verified: true }),
    ).toBe(false);
  });
});

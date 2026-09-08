import { describe, expect, it } from "vitest";

import { decideHybridVerification } from "./decision-engine";
import type { HybridDecisionInput } from "./hybrid-types";

const PHARMACIST: HybridDecisionInput = {
  hasIdentityDocument: true,
  hasCredentialDocument: true,
  submittedName: "Tinashe Moyo",
    submittedProfession: "Pharmacist",
    submittedRegulatoryBody: "PCZ",
  identity: { status: "unavailable" },
  credential: { status: "unavailable" },
  registry: {
    outcome: "MATCH",
    registryAvailable: true,
    registryNameMatch: true,
    registryProfessionMatch: true,
    matchedRegistryId: "reg-1",
    reason: "Active unique HPA registration matched.",
  },
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

describe("hybrid verification decision engine", () => {
  it("never auto-verifies when document analysis is unavailable", () => {
    const result = decideHybridVerification(PHARMACIST);
    expect(result.decision).toBe("processing");
    expect(result.decision).not.toBe("verified");
  });

  it("auto-verifies a covered profession with processed documents plus a registry MATCH", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      identity: PROCESSED_ID,
      credential: PROCESSED_CERT,
    });
    expect(result.decision).toBe("verified");
    expect(result.reviewRequired).toBe(false);
  });

  it("does not auto-verify a covered profession on registry NOT_FOUND", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      identity: PROCESSED_ID,
      credential: PROCESSED_CERT,
      registry: {
        outcome: "NOT_FOUND",
        registryAvailable: true,
        registryNameMatch: null,
        registryProfessionMatch: null,
        matchedRegistryId: null,
        reason: "No registry record matched this registration number.",
      },
    });
    expect(result.decision).toBe("manual_review");
    expect(result.decision).not.toBe("verified");
  });

  it("never auto-verifies a registry CONTRADICTION", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      identity: PROCESSED_ID,
      credential: PROCESSED_CERT,
      registry: {
        outcome: "CONTRADICTION",
        registryAvailable: true,
        registryNameMatch: false,
        registryProfessionMatch: true,
        matchedRegistryId: "reg-1",
        reason: "Submitted name does not match the registry record.",
      },
    });
    expect(result.decision).toBe("manual_review");
    expect(result.decision).not.toBe("verified");
  });

  it("sends a non-registry profession with strong evidence to manual review", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      submittedProfession: "Digital Health Specialist",
      submittedRegulatoryBody: "AHPCZ",
      identity: PROCESSED_ID,
      credential: {
        ...PROCESSED_CERT,
        credentialType: "degree",
        credentialClass: "qualification",
        detectedProfession: "Digital Health Specialist",
      },
      registry: {
        outcome: "UNAVAILABLE_FOR_PROFESSION",
        registryAvailable: false,
        registryNameMatch: null,
        registryProfessionMatch: null,
        matchedRegistryId: null,
        reason: "No compatible practitioner register exists for this profession.",
      },
    });
    expect(result.decision).toBe("manual_review");
    expect(result.decision).not.toBe("verified");
    expect(result.verificationMethod).toBe("hybrid");
  });

  it("does not auto-verify a non-registry profession with weak evidence", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      submittedProfession: "Digital Health Specialist",
      identity: { ...PROCESSED_ID, extractionQuality: "poor", documentQuality: "poor" },
      credential: {
        ...PROCESSED_CERT,
        credentialType: "degree",
        credentialClass: "qualification",
        detectedProfession: "Digital Health Specialist",
        extractionQuality: "poor",
      },
      registry: {
        outcome: "UNAVAILABLE_FOR_PROFESSION",
        registryAvailable: false,
        registryNameMatch: null,
        registryProfessionMatch: null,
        matchedRegistryId: null,
        reason: "No register.",
      },
    });
    expect(result.decision).not.toBe("verified");
    expect(result.decision).toBe("additional_evidence_required");
  });

  it("never auto-verifies incompatible names", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      identity: { ...PROCESSED_ID, identityName: "Jane Doe" },
      credential: PROCESSED_CERT,
    });
    expect(result.decision).not.toBe("verified");
    expect(result.decision).toBe("manual_review");
  });

  it("never auto-verifies an incompatible profession", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      identity: PROCESSED_ID,
      credential: { ...PROCESSED_CERT, detectedProfession: "Dentist" },
    });
    expect(result.decision).not.toBe("verified");
    expect(result.decision).toBe("manual_review");
  });

  it("never auto-verifies an expired required credential", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      identity: PROCESSED_ID,
      credential: { ...PROCESSED_CERT, expiryDate: "2020-01-01" },
    });
    expect(result.decision).not.toBe("verified");
    expect(result.decision).toBe("additional_evidence_required");
  });

  it("does not reject professions without a register when analysis is unavailable", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      submittedProfession: "Digital Health Specialist",
      registry: {
        outcome: "UNAVAILABLE_FOR_PROFESSION",
        registryAvailable: false,
        registryNameMatch: null,
        registryProfessionMatch: null,
        matchedRegistryId: null,
        reason: "No compatible practitioner register exists for this profession.",
      },
    });
    expect(result.decision).toBe("processing");
    expect(result.decision).not.toBe("rejected");
    expect(result.decision).not.toBe("verified");
  });

  it("requires both documents", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      hasIdentityDocument: false,
    });
    expect(result.decision).toBe("pending_documents");
  });

  it("does not treat model confidence as a verification grant", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      submittedProfession: "Digital Health Specialist",
      identity: { ...PROCESSED_ID, confidence: 0.99, extractionQuality: "poor" },
      credential: {
        ...PROCESSED_CERT,
        credentialType: "degree",
        credentialClass: "qualification",
        detectedProfession: "Digital Health Specialist",
        confidence: 0.99,
        extractionQuality: "poor",
      },
      registry: {
        outcome: "UNAVAILABLE_FOR_PROFESSION",
        registryAvailable: false,
        registryNameMatch: null,
        registryProfessionMatch: null,
        matchedRegistryId: null,
        reason: "No register.",
      },
    });
    expect(result.decision).not.toBe("verified");
  });

  it("does not auto-verify a licensed profession from a degree alone", () => {
    const result = decideHybridVerification({
      ...PHARMACIST,
      submittedProfession: "Dentist",
      identity: PROCESSED_ID,
      credential: {
        ...PROCESSED_CERT,
        credentialType: "degree",
        credentialClass: "qualification",
        detectedProfession: "Dentist",
      },
      registry: {
        outcome: "UNAVAILABLE_FOR_PROFESSION",
        registryAvailable: false,
        registryNameMatch: null,
        registryProfessionMatch: null,
        matchedRegistryId: null,
        reason: "No register.",
      },
    });
    expect(result.decision).not.toBe("verified");
    expect(result.decision).toBe("additional_evidence_required");
  });
});

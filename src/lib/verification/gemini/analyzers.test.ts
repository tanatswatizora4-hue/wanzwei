import { describe, expect, it } from "vitest";

import {
  createGeminiCredentialAnalyzer,
  createGeminiIdentityAnalyzer,
} from "./analyzers";
import {
  mapCredentialExtraction,
  mapIdentityExtraction,
  parseJsonObject,
} from "./map-response";

const PDF = {
  storagePath: "professional/user/id.pdf",
  contentType: "application/pdf",
  bytes: new Uint8Array([1, 2, 3, 4]),
};

describe("Gemini identity analyzer", () => {
  it("maps a good extraction", async () => {
    const analyzer = createGeminiIdentityAnalyzer(async () =>
      JSON.stringify({
        documentType: "national_id",
        fullName: "Tanatswa Tizora",
        givenNames: "Tanatswa",
        surname: "Tizora",
        identityNumberPresent: true,
        readability: "readable",
        extractionQuality: "high",
        confidence: 0.86,
        uncertaintyFlags: [],
      }),
    );
    const result = await analyzer.analyze(PDF);
    expect(result.status).toBe("processed");
    expect(result.identityName).toBe("Tanatswa Tizora");
    expect(result.identityDocumentType).toBe("national_id");
    expect(result).not.toHaveProperty("identityNumber");
  });

  it("marks an unreadable image as unreadable", async () => {
    const analyzer = createGeminiIdentityAnalyzer(async () =>
      JSON.stringify({ readability: "unreadable" }),
    );
    const result = await analyzer.analyze(PDF);
    expect(result.status).toBe("unreadable");
  });

  it("keeps processed status when the name is missing", async () => {
    const analyzer = createGeminiIdentityAnalyzer(async () =>
      JSON.stringify({
        documentType: "passport",
        readability: "readable",
        extractionQuality: "medium",
      }),
    );
    const result = await analyzer.analyze(PDF);
    expect(result.status).toBe("processed");
    expect(result.identityName ?? "").toBe("");
  });

  it("treats a malformed response as unreadable", async () => {
    const analyzer = createGeminiIdentityAnalyzer(async () => "not-json");
    const result = await analyzer.analyze(PDF);
    expect(result.status).toBe("unreadable");
  });

  it("treats API failure as unavailable", async () => {
    const analyzer = createGeminiIdentityAnalyzer(async () => {
      throw new Error("timeout");
    });
    const result = await analyzer.analyze(PDF);
    expect(result.status).toBe("unavailable");
  });

  it("is unavailable without document bytes", async () => {
    const analyzer = createGeminiIdentityAnalyzer(async () => {
      throw new Error("should not be called");
    });
    const result = await analyzer.analyze({
      storagePath: "x",
      contentType: "application/pdf",
    });
    expect(result.status).toBe("unavailable");
  });
});

describe("Gemini credential analyzer", () => {
  it("maps a practising certificate", async () => {
    const analyzer = createGeminiCredentialAnalyzer(async () =>
      JSON.stringify({
        credentialType: "practising_certificate",
        holderName: "Tanatswa Tizora",
        profession: "Pharmacist",
        registrationNumber: "P01-6420-2026",
        issuingBody: "HPA",
        expiryDate: "2027-02-28",
        readability: "readable",
        extractionQuality: "high",
        confidence: 0.9,
      }),
    );
    const result = await analyzer.analyze(PDF);
    expect(result.status).toBe("processed");
    expect(result.credentialClass).toBe("current_authorization");
    expect(result.registrationNumber).toBe("P01-6420-2026");
  });

  it("maps a degree as qualification evidence", async () => {
    const analyzer = createGeminiCredentialAnalyzer(async () =>
      JSON.stringify({
        credentialType: "degree",
        holderName: "Tanatswa Tizora",
        profession: "Digital Health Specialist",
        qualification: "BSc",
        readability: "readable",
        extractionQuality: "high",
      }),
    );
    const result = await analyzer.analyze(PDF);
    expect(result.credentialClass).toBe("qualification");
  });

  it("allows a missing registration number", async () => {
    const analyzer = createGeminiCredentialAnalyzer(async () =>
      JSON.stringify({
        credentialType: "qualification",
        holderName: "Tanatswa Tizora",
        profession: "Health Economist",
        readability: "readable",
        extractionQuality: "high",
      }),
    );
    const result = await analyzer.analyze(PDF);
    expect(result.status).toBe("processed");
    expect(result.registrationNumber ?? null).toBeNull();
  });

  it("keeps an expired date for the decision engine", async () => {
    const analyzer = createGeminiCredentialAnalyzer(async () =>
      JSON.stringify({
        credentialType: "practising_certificate",
        holderName: "Tanatswa Tizora",
        profession: "Nurse",
        expiryDate: "2020-01-01",
        readability: "readable",
        extractionQuality: "high",
      }),
    );
    const result = await analyzer.analyze(PDF);
    expect(result.expiryDate).toBe("2020-01-01");
  });

  it("treats a malformed response as unreadable", async () => {
    const analyzer = createGeminiCredentialAnalyzer(async () => "{");
    const result = await analyzer.analyze(PDF);
    expect(result.status).toBe("unreadable");
  });

  it("treats API failure as unavailable", async () => {
    const analyzer = createGeminiCredentialAnalyzer(async () => {
      throw new Error("429");
    });
    const result = await analyzer.analyze(PDF);
    expect(result.status).toBe("unavailable");
  });
});

describe("Gemini JSON sanitization", () => {
  it("drops identity-number keys before mapping", () => {
    const parsed = parseJsonObject(
      JSON.stringify({
        fullName: "Tanatswa Tizora",
        nationalId: "63-123456-A-00",
        passportNumber: "FN12345",
        readability: "readable",
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty("nationalId");
    expect(parsed).not.toHaveProperty("passportNumber");
    const mapped = mapIdentityExtraction(parsed!);
    expect(mapped.identityName).toBe("Tanatswa Tizora");
    expect(JSON.stringify(mapped)).not.toContain("63-123456");
  });

  it("does not copy verified from the model", () => {
    const mapped = mapCredentialExtraction({
      holderName: "Tanatswa Tizora",
      credentialType: "practising_certificate",
      verified: true,
      readability: "readable",
    });
    expect(mapped).not.toHaveProperty("verified");
    expect(mapped.status).toBe("processed");
  });
});

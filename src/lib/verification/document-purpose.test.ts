import { describe, expect, it } from "vitest";

import {
  isSensitiveVerificationDocument,
  parseProfessionalDocumentPurpose,
} from "./document-purpose";

describe("professional document purpose", () => {
  it("parses allowed purposes only", () => {
    expect(parseProfessionalDocumentPurpose("identity")).toBe("identity");
    expect(parseProfessionalDocumentPurpose("credential")).toBe("credential");
    expect(parseProfessionalDocumentPurpose("supporting")).toBe("supporting");
    expect(parseProfessionalDocumentPurpose("public")).toBeNull();
  });

  it("treats identity and credential files as sensitive", () => {
    expect(isSensitiveVerificationDocument("identity")).toBe(true);
    expect(isSensitiveVerificationDocument("credential")).toBe(true);
    expect(isSensitiveVerificationDocument("supporting")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { DocumentUploadSchema } from "./uploads";
import { SubmitVerificationSchema } from "./verifications";

describe("DocumentUploadSchema purpose", () => {
  const file = new File(["id"], "id.pdf", { type: "application/pdf" });

  it("defaults missing purpose to supporting", () => {
    expect(DocumentUploadSchema.parse({ file }).purpose).toBe("supporting");
  });

  it("accepts identity and credential purposes", () => {
    expect(
      DocumentUploadSchema.parse({ file, purpose: "identity" }).purpose,
    ).toBe("identity");
    expect(
      DocumentUploadSchema.parse({ file, purpose: "credential" }).purpose,
    ).toBe("credential");
  });

  it("rejects an unknown purpose", () => {
    expect(
      DocumentUploadSchema.safeParse({ file, purpose: "public" }).success,
    ).toBe(false);
  });
});

describe("submit schema authority fields", () => {
  it("does not let the client set verified or decision", () => {
    expect(
      SubmitVerificationSchema.safeParse({
        profession: "Pharmacist",
        identityDocumentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        credentialDocumentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        verified: true,
        decision: "verified",
      }).success,
    ).toBe(false);
  });
});

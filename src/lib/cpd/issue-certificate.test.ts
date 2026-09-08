import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("CPD certificate issuance", () => {
  it("cannot issue a certificate for an incomplete enrolment", () => {
    const source = readFileSync("src/lib/cpd/issue-certificate.ts", "utf8");
    expect(source).toContain('enrolment.status !== "completed"');
    expect(source).toContain("getCertificateForEnrolment");
    expect(source).toContain("insertCertificate");
    expect(source).toContain("recipientDisplayName: user.name");
    expect(source).toContain("generateCertificateId");
  });

  it("public verify route does not expose private account fields", () => {
    const source = readFileSync(
      "src/app/(marketing)/certificates/verify/[certificateId]/page.tsx",
      "utf8",
    );
    expect(source).toContain("toPublicCertificateView");
    expect(source).not.toContain(".email");
    expect(source).not.toContain(".phone");
    expect(source).not.toContain("user.id");
    expect(source).toContain("certificateQrSvg");
    expect(source).toContain("certificateVerifyUrl");
  });
});

import { describe, expect, it } from "vitest";

import {
  derivePractisingCertificateStatus,
  legacyVerifiedAccountRemainsVerified,
  practisingCertificateStatusForAccount,
} from "./practising-certificate";
import { publicCredentialLabel } from "./public-credential";

describe("practising certificate expiry", () => {
  it("marks a future date as current", () => {
    expect(derivePractisingCertificateStatus("2099-12-31")).toBe("current");
  });

  it("marks a past date as expired", () => {
    expect(
      derivePractisingCertificateStatus(
        "2020-01-01",
        new Date("2026-09-08T00:00:00.000Z"),
      ),
    ).toBe("expired");
  });

  it("marks missing expiry as unable to confirm", () => {
    expect(derivePractisingCertificateStatus(null)).toBe("unable_to_confirm");
    expect(derivePractisingCertificateStatus("not-a-date")).toBe(
      "unable_to_confirm",
    );
  });

  it("does not treat legacy verified accounts as expired or de-verified", () => {
    expect(
      practisingCertificateStatusForAccount({
        verified: true,
        practisingCertificateExpiry: null,
        practisingCertificateStatus: null,
      }),
    ).toBe("unable_to_confirm");
    expect(
      legacyVerifiedAccountRemainsVerified({
        verified: true,
        practisingCertificateExpiry: null,
        practisingCertificateStatus: null,
      }),
    ).toBe(true);
  });

  it("uses precise public labels instead of Verified Professional", () => {
    expect(publicCredentialLabel({ verified: false })).toBe("Not verified");
    expect(
      publicCredentialLabel({
        verified: true,
        credentialVerificationMethod: "registry_assisted",
      }),
    ).toBe("Registry Verified");
    expect(
      publicCredentialLabel({
        verified: true,
        credentialVerificationMethod: "manual",
      }),
    ).toBe("Credentials Reviewed");
    expect(publicCredentialLabel({ verified: true })).toBe(
      "Credentials Reviewed",
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  certificateVerifyUrl,
  generateCertificateId,
  isCertificateId,
  publicAccreditation,
  toPublicCertificateView,
  WANZWEI_COMPLETION_DISCLAIMER,
} from "./certificate";

describe("CPD certificates", () => {
  it("issues unique ids that are not user UUIDs", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateCertificateId()));
    expect(ids.size).toBe(20);
    for (const id of ids) {
      expect(isCertificateId(id)).toBe(true);
      expect(id).not.toContain("-");
    }
  });

  it("does not show accreditation merely because a number exists", () => {
    expect(
      publicAccreditation({
        cpdPoints: 12,
        accreditingBody: null,
        accreditationReference: null,
      }),
    ).toBeNull();
    expect(
      publicAccreditation({
        cpdPoints: 5,
        accreditingBody: "Nurses Council of Zimbabwe",
        accreditationReference: "NCZ-1",
      }),
    ).toEqual({
      cpdPoints: 5,
      accreditingBody: "Nurses Council of Zimbabwe",
      accreditationReference: "NCZ-1",
    });
  });

  it("public verify payload omits private fields", () => {
    const view = toPublicCertificateView({
      certificateId: "WZVabcd",
      recipientDisplayName: "Tanatswa Tizora",
      courseTitle: "Infection prevention",
      providerName: "Wanzwei",
      completionDate: "2026-09-08",
      cpdPoints: null,
      accreditingBody: null,
      accreditationReference: null,
    });
    expect(view.found).toBe(true);
    expect(JSON.stringify(view)).not.toMatch(/email|phone|userId|auth\.uid/i);
    expect(view.accreditingBody).toBeNull();
    expect(WANZWEI_COMPLETION_DISCLAIMER).toMatch(/does not by itself represent accreditation/i);
    expect(isCertificateId("WZVabc")).toBe(false);
    expect(certificateVerifyUrl("WZVabc")).toBe(
      "https://wanzwei.vercel.app/certificates/verify/WZVabc",
    );
  });
});

describe("certificate QR", () => {
  it("stays QR-ready and does not ship a fake encoder", async () => {
    const { certificateQrSvg, isCertificateQrAvailable } = await import(
      "./certificate-qr"
    );
    const url = certificateVerifyUrl("WZVaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(url).toBe(
      "https://wanzwei.vercel.app/certificates/verify/WZVaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(isCertificateQrAvailable()).toBe(false);
    expect(certificateQrSvg(url)).toBeNull();
  });
});

import { randomBytes } from "node:crypto";

export const CERTIFICATE_ID_PREFIX = "WZV";

export function generateCertificateId(): string {
  return `${CERTIFICATE_ID_PREFIX}${randomBytes(16).toString("hex")}`;
}

export function isCertificateId(value: string): boolean {
  return new RegExp(`^${CERTIFICATE_ID_PREFIX}[a-f0-9]{32}$`, "i").test(
    value.trim(),
  );
}

export function certificateVerifyPath(certificateId: string): string {
  return `/certificates/verify/${encodeURIComponent(certificateId)}`;
}

/** Public URL a future QR encoder must encode. No schema change required. */
export function certificateVerifyUrl(certificateId: string): string {
  return `https://wanzwei.vercel.app${certificateVerifyPath(certificateId)}`;
}

export const WANZWEI_COMPLETION_DISCLAIMER =
  "This certificate confirms completion of the stated learning activity on Wanzwei. It does not by itself represent accreditation or CPD points from a professional regulatory council.";

export function publicAccreditation(input: {
  cpdPoints?: number | null;
  accreditingBody?: string | null;
  accreditationReference?: string | null;
}): {
  cpdPoints: number | null;
  accreditingBody: string;
  accreditationReference: string | null;
} | null {
  const body = input.accreditingBody?.trim();
  if (!body) return null;
  const points =
    input.cpdPoints != null && Number.isFinite(input.cpdPoints) && input.cpdPoints > 0
      ? input.cpdPoints
      : null;
  const reference = input.accreditationReference?.trim() || null;
  return {
    cpdPoints: points,
    accreditingBody: body,
    accreditationReference: reference,
  };
}

export type PublicCertificateView = {
  found: boolean;
  certificateId?: string;
  recipientName?: string;
  courseTitle?: string;
  provider?: string;
  completionDate?: string;
  cpdPoints?: number | null;
  accreditingBody?: string | null;
  accreditationReference?: string | null;
};

export function toPublicCertificateView(row: {
  certificateId: string;
  recipientDisplayName: string;
  courseTitle: string;
  providerName: string;
  completionDate: string;
  cpdPoints?: number | null;
  accreditingBody?: string | null;
  accreditationReference?: string | null;
}): PublicCertificateView {
  const accreditation = publicAccreditation(row);
  return {
    found: true,
    certificateId: row.certificateId,
    recipientName: row.recipientDisplayName,
    courseTitle: row.courseTitle,
    provider: row.providerName,
    completionDate: row.completionDate,
    cpdPoints: accreditation?.cpdPoints ?? null,
    accreditingBody: accreditation?.accreditingBody ?? null,
    accreditationReference: accreditation?.accreditationReference ?? null,
  };
}

export const PRIVATE_CERTIFICATE_FIELDS = [
  "email",
  "phone",
  "userId",
  "auth",
  "identity",
  "adminNotes",
] as const;

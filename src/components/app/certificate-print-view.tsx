import { PrintCertificateButton } from "@/components/app/print-certificate-button";
import { WANZWEI_COMPLETION_DISCLAIMER } from "@/lib/cpd/certificate";
import type { CpdCertificateRecord } from "@/lib/repos/cpd-certificates";

export function CertificatePrintView({
  certificate,
  verifyUrl,
  qrSvg = null,
  disclaimer = WANZWEI_COMPLETION_DISCLAIMER,
  showPrint = true,
}: {
  certificate: Pick<
    CpdCertificateRecord,
    | "recipientDisplayName"
    | "courseTitle"
    | "providerName"
    | "completionDate"
    | "certificateId"
    | "cpdPoints"
    | "accreditingBody"
    | "accreditationReference"
  >;
  verifyUrl: string;
  qrSvg?: string | null;
  disclaimer?: string;
  showPrint?: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl bg-white px-6 py-10 print:px-0">
      <div className="rounded-[16px] border border-[color:var(--color-border-default)] p-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-600)]">
          Wanzwei
        </p>
        <h1 className="mt-2 font-display text-[28px] font-semibold tracking-tight">
          Certificate of Completion
        </h1>
        <p className="mt-6 text-[15px] text-[color:var(--color-ink-600)]">This certifies that</p>
        <p className="mt-1 font-display text-[26px] font-semibold">
          {certificate.recipientDisplayName}
        </p>
        <p className="mt-6 text-[15px] text-[color:var(--color-ink-600)]">completed</p>
        <p className="mt-1 text-[20px] font-semibold">{certificate.courseTitle}</p>
        <p className="mt-1 text-[14px] text-[color:var(--color-ink-500)]">
          Provider: {certificate.providerName}
        </p>
        <p className="mt-2 text-[14px] text-[color:var(--color-ink-500)]">
          Completion date: {certificate.completionDate}
        </p>
        {certificate.accreditingBody ? (
          <p className="mt-4 text-[14px] text-[color:var(--color-ink-700)]">
            Accredited by {certificate.accreditingBody}
            {certificate.cpdPoints != null ? ` · ${certificate.cpdPoints} CPD points` : ""}
            {certificate.accreditationReference
              ? ` · Ref ${certificate.accreditationReference}`
              : ""}
          </p>
        ) : (
          <p className="mt-4 text-[13px] text-[color:var(--color-ink-500)]">{disclaimer}</p>
        )}
        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] text-[color:var(--color-ink-400)]">Certificate ID</p>
            <p className="font-mono text-[13px]">{certificate.certificateId}</p>
            <p className="mt-2 break-all text-[12px] text-[color:var(--color-ink-400)]">
              Verify: {verifyUrl}
            </p>
          </div>
          {qrSvg ? (
            <div
              className="h-[140px] w-[140px] text-[color:var(--color-ink-900)]"
              aria-label="Certificate verification QR code"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : null}
        </div>
        {showPrint ? <PrintCertificateButton /> : null}
      </div>
    </div>
  );
}

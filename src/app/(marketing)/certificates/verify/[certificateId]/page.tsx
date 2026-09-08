import { CertificatePrintView } from "@/components/app/certificate-print-view";
import {
  certificateVerifyUrl,
  isCertificateId,
  toPublicCertificateView,
  WANZWEI_COMPLETION_DISCLAIMER,
} from "@/lib/cpd/certificate";
import { certificateQrSvg } from "@/lib/cpd/certificate-qr";
import { getCertificateByPublicId } from "@/lib/repos/cpd-certificates";

export default async function PublicCertificateVerifyPage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const certificateId = (await params).certificateId?.trim() ?? "";
  const validFormat = isCertificateId(certificateId);
  const certificate = validFormat
    ? await getCertificateByPublicId(certificateId)
    : null;

  if (!certificate) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-2xl font-semibold">Certificate not found</h1>
        <p className="mt-2 text-sm text-[color:var(--color-ink-500)]">
          This verification link is invalid or does not match a Wanzwei Certificate of
          Completion.
        </p>
      </div>
    );
  }

  const publicView = toPublicCertificateView(certificate);
  const verifyUrl = certificateVerifyUrl(certificate.certificateId);
  const qrSvg = await certificateQrSvg(verifyUrl);
  return (
    <CertificatePrintView
      certificate={{
        recipientDisplayName:
          publicView.recipientName ?? certificate.recipientDisplayName,
        courseTitle: publicView.courseTitle ?? certificate.courseTitle,
        providerName: publicView.provider ?? certificate.providerName,
        completionDate: publicView.completionDate ?? certificate.completionDate,
        certificateId: certificate.certificateId,
        cpdPoints: publicView.cpdPoints ?? null,
        accreditingBody: publicView.accreditingBody ?? null,
        accreditationReference: publicView.accreditationReference ?? null,
      }}
      verifyUrl={verifyUrl}
      qrSvg={qrSvg}
      disclaimer={WANZWEI_COMPLETION_DISCLAIMER}
      showPrint={false}
    />
  );
}

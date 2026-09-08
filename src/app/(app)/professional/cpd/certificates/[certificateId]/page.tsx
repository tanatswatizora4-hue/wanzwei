import { notFound } from "next/navigation";

import { CertificatePrintView } from "@/components/app/certificate-print-view";
import { requireRole } from "@/lib/auth/session";
import {
  certificateVerifyUrl,
  WANZWEI_COMPLETION_DISCLAIMER,
} from "@/lib/cpd/certificate";
import { certificateQrSvg } from "@/lib/cpd/certificate-qr";
import { getCertificateForUser } from "@/lib/repos/cpd-certificates";

export default async function ProfessionalCertificatePrintPage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const user = await requireRole(["professional"]);
  const certificateId = (await params).certificateId?.trim() ?? "";
  const certificate = await getCertificateForUser(user.id, certificateId);
  if (!certificate) notFound();

  const verifyUrl = certificateVerifyUrl(certificate.certificateId);
  const qrSvg = await certificateQrSvg(verifyUrl);

  return (
    <CertificatePrintView
      certificate={certificate}
      verifyUrl={verifyUrl}
      qrSvg={qrSvg}
      disclaimer={WANZWEI_COMPLETION_DISCLAIMER}
    />
  );
}

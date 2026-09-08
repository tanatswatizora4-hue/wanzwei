import { PageHeader } from "@/components/app/topbar";
import { requireRole } from "@/lib/auth/session";
import {
  certificateVerifyPath,
  WANZWEI_COMPLETION_DISCLAIMER,
} from "@/lib/cpd/certificate";
import { listCertificatesForUser } from "@/lib/repos/cpd-certificates";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FileBadge } from "lucide-react";
import Link from "next/link";

export default async function ProfessionalCertificatesPage() {
  const user = await requireRole(["professional"]);
  const certificates = await listCertificatesForUser(user.id);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Certificates"
        description="Wanzwei Certificates of Completion for CPD activities you have finished. These do not by themselves represent council-accredited CPD points."
      />
      {certificates.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileBadge className="h-4 w-4" />}
            title="No certificates yet"
            description="Complete a CPD activity to receive a Wanzwei Certificate of Completion."
            action={
              <Link
                href="/professional/cpd"
                className="text-[13px] font-medium text-[color:var(--color-brand-600)] hover:underline"
              >
                Browse CPD
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {certificates.map((certificate) => (
            <Card key={certificate.certificateId}>
              <CardBody className="flex flex-col gap-2 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold">{certificate.courseTitle}</p>
                  <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                    {certificate.providerName} · Completed{" "}
                    {certificate.completionDate} · ID {certificate.certificateId}
                  </p>
                  {certificate.accreditingBody ? (
                    <p className="text-[12px] text-[color:var(--color-ink-500)]">
                      Accredited by {certificate.accreditingBody}
                      {certificate.cpdPoints != null
                        ? ` · ${certificate.cpdPoints} CPD points`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-[12px] text-[color:var(--color-ink-400)]">
                      {WANZWEI_COMPLETION_DISCLAIMER}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-[13px]">
                  <Link
                    href={`/professional/cpd/certificates/${certificate.certificateId}`}
                    className="font-medium text-[color:var(--color-brand-600)] hover:underline"
                  >
                    View / print
                  </Link>
                  <Link
                    href={certificateVerifyPath(certificate.certificateId)}
                    className="font-medium text-[color:var(--color-brand-600)] hover:underline"
                  >
                    Verification link
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

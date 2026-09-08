import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminVerificationDecisions } from "@/components/app/admin/verification/verification-decisions";
import { AdminVerificationDocuments } from "@/components/app/admin/verification/verification-documents";
import { PageHeader } from "@/components/app/topbar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { timeAgoLong } from "@/lib/format";
import { parseUuid } from "@/lib/ids";
import { getRegistryByIdForAdmin } from "@/lib/repos/practitioner-registry";
import { findUserById } from "@/lib/repos/users";
import {
  getVerification,
  listVerificationEvents,
} from "@/lib/repos/verifications";
import { findLatestVerificationEvidence } from "@/lib/repos/verification-evidence";
import { displayRegulatoryBody } from "@/lib/regulatory-bodies";
import { displayPractisingCertificateStatus, practisingCertificateStatusForAccount } from "@/lib/verification/practising-certificate";

export default async function AdminVerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const verificationId = parseUuid(id);
  if (!verificationId) notFound();

  const verification = await getVerification(verificationId);
  if (!verification) notFound();

  const [account, events, registry, evidence] = await Promise.all([
    findUserById(verification.userId),
    listVerificationEvents(verification.id),
    verification.matchedRegistryId
      ? getRegistryByIdForAdmin(verification.matchedRegistryId)
      : Promise.resolve(null),
    findLatestVerificationEvidence(verification.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={verification.name}
        description="Manual verification case. Registry comparison is corroboration when a supported source exists, and is admin-only."
        meta={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/verification">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
            </Link>
          </Button>
        }
        actions={<StatusBadge status={verification.status} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="pt-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
              Account
            </h2>
            <dl className="mt-3 grid gap-2 text-[13px]">
              <Row label="Name" value={account?.name ?? verification.name} />
              <Row label="Email" value={account?.email ?? "—"} />
              <Row label="Profession" value={account?.profession ?? verification.profession} />
              <Row
                label="Account verified"
                value={account?.verified ? "Verified" : "Not verified"}
              />
              <Row
                label="Identity evidence"
                value={account?.identityVerificationStatus ?? "—"}
              />
              <Row
                label="Credential status"
                value={account?.credentialStatus ?? "—"}
              />
              <Row
                label="Verification method"
                value={
                  account?.credentialVerificationMethod?.replaceAll("_", " ") ?? "—"
                }
              />
              <Row
                label="Practising certificate"
                value={displayPractisingCertificateStatus(
                  practisingCertificateStatusForAccount({
                    verified: account?.verified,
                    practisingCertificateExpiry: account?.practisingCertificateExpiry,
                    practisingCertificateStatus: account?.practisingCertificateStatus,
                  }),
                )}
              />
              <Row
                label="Certificate expiry"
                value={account?.practisingCertificateExpiry ?? "—"}
              />
              <Row
                label="Last reviewed"
                value={
                  account?.lastVerificationReviewAt
                    ? timeAgoLong(account.lastVerificationReviewAt)
                    : "—"
                }
              />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
              Submission
            </h2>
            <dl className="mt-3 grid gap-2 text-[13px]">
              <Row label="Profession" value={verification.profession} />
              <Row
                label="Regulatory body"
                value={displayRegulatoryBody(
                  verification.registeringBody,
                  verification.regulatoryBodyOther,
                )}
              />
              <Row label="Registration number" value={verification.registrationNumber ?? "—"} />
              <Row label="Submitted" value={timeAgoLong(verification.submittedAt)} />
              <Row label="Status" value={verification.status} />
              <Row
                label="Match outcome"
                value={verification.matchOutcome?.replaceAll("_", " ") ?? "—"}
              />
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="pt-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
            Hybrid evidence
          </h2>
          {evidence ? (
            <dl className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
              <Row label="Identity name" value={evidence.identityName ?? "—"} />
              <Row
                label="Identity document"
                value={evidence.identityDocumentType ?? "—"}
              />
              <Row label="Identity quality" value={evidence.identityQuality ?? "—"} />
              <Row label="Credential name" value={evidence.credentialName ?? "—"} />
              <Row label="Credential type" value={evidence.credentialType ?? "—"} />
              <Row
                label="Credential class"
                value={evidence.credentialClass?.replaceAll("_", " ") ?? "—"}
              />
              <Row
                label="Credential quality"
                value={evidence.credentialQuality ?? "—"}
              />
              <Row
                label="Detected profession"
                value={evidence.detectedProfession ?? "—"}
              />
              <Row label="Issuing body" value={evidence.issuingBody ?? "—"} />
              <Row
                label="Registration number"
                value={evidence.registrationNumber ?? "—"}
              />
              <Row label="Issue date" value={evidence.issueDate ?? "—"} />
              <Row label="Expiry" value={evidence.expiryDate ?? "—"} />
              <Row label="Name comparison" value={evidence.nameMatch ?? "—"} />
              <Row
                label="Profession comparison"
                value={evidence.professionMatch ?? "—"}
              />
              <Row label="Expiry check" value={evidence.expiryCheck ?? "—"} />
              <Row
                label="Registry result"
                value={evidence.registryOutcome?.replaceAll("_", " ") ?? "—"}
              />
              <Row
                label="Verification method"
                value={evidence.verificationMethod.replaceAll("_", " ")}
              />
              <Row label="Analyzer status" value={evidence.analysisStatus} />
              <Row
                label="Deterministic decision"
                value={evidence.decision.replaceAll("_", " ")}
              />
              <Row label="Decision reason" value={evidence.decisionReason} />
            </dl>
          ) : (
            <p className="mt-3 text-[13px] text-[color:var(--color-ink-500)]">
              No structured analysis evidence is stored for this case yet.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
            Registry comparison
          </h2>
          {registry ? (
            <dl className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
              <Row label="Registry name" value={registry.fullName} />
              <Row label="Qualification" value={registry.qualification} />
              <Row label="Registration number" value={registry.registrationNumber} />
              <Row label="Expiry" value={registry.expiryDate} />
              <Row label="Registry status" value={registry.derivedStatus} />
              <Row
                label="Matcher result"
                value={verification.matchOutcome?.replaceAll("_", " ") ?? "—"}
              />
            </dl>
          ) : (
            <p className="mt-3 text-[13px] text-[color:var(--color-ink-500)]">
              No matched registry record is attached to this case.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
            Documents
          </h2>
          <div className="mt-3">
            <AdminVerificationDocuments verificationId={verification.id} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
            History
          </h2>
          {events.length === 0 ? (
            <EmptyState
              title="No events yet"
              description="Manual decisions and automatic matcher results will appear here."
            />
          ) : (
            <ul className="mt-3 divide-y divide-[color:var(--color-border-default)]">
              {events.map((event) => (
                <li key={event.id} className="py-3 text-[13px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {event.fromStatus ?? "—"} → {event.toStatus}
                    </span>
                    <Badge tone="slate">{event.method}</Badge>
                    <span className="text-[color:var(--color-ink-400)]">
                      {timeAgoLong(event.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
                    {event.actorName ?? "System"}
                    {event.reason ? ` · ${event.reason}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <AdminVerificationDecisions
        verificationId={verification.id}
        status={verification.status}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[color:var(--color-ink-800)]">{value}</dd>
    </div>
  );
}

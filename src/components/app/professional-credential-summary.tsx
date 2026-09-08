import { Badge } from "@/components/ui/badge";
import { publicCredentialSummary } from "@/lib/verification/public-credential";
import type { User } from "@/lib/types";

function formatReviewedAt(value: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProfessionalCredentialSummary({
  user,
}: {
  user: Pick<
    User,
    | "verified"
    | "registeringBody"
    | "regulatoryBodyOther"
    | "registrationNumber"
    | "practisingCertificateExpiry"
    | "practisingCertificateStatus"
    | "credentialVerificationMethod"
    | "lastVerificationReviewAt"
  >;
}) {
  const summary = publicCredentialSummary(user);
  const tone =
    summary.label === "Not verified"
      ? "amber"
      : summary.label === "Registry Verified"
        ? "success"
        : "info";

  return (
    <div className="flex flex-col gap-2">
      <Badge tone={tone} withDot>
        {summary.label}
      </Badge>
      <dl className="grid gap-1 text-[12.5px] text-[color:var(--color-ink-600)]">
        <div>
          <dt className="inline font-medium text-[color:var(--color-ink-700)]">
            Regulatory body:{" "}
          </dt>
          <dd className="inline">{summary.regulatoryBody}</dd>
        </div>
        {summary.registrationNumber ? (
          <div>
            <dt className="inline font-medium text-[color:var(--color-ink-700)]">
              Registration:{" "}
            </dt>
            <dd className="inline">{summary.registrationNumber}</dd>
          </div>
        ) : null}
        <div>
          <dt className="inline font-medium text-[color:var(--color-ink-700)]">
            Practising certificate:{" "}
          </dt>
          <dd className="inline">{summary.practisingCertificateLabel}</dd>
        </div>
        {summary.validUntil ? (
          <div>
            <dt className="inline font-medium text-[color:var(--color-ink-700)]">
              Valid until:{" "}
            </dt>
            <dd className="inline">{summary.validUntil}</dd>
          </div>
        ) : null}
        {summary.lastReviewed ? (
          <div>
            <dt className="inline font-medium text-[color:var(--color-ink-700)]">
              Last reviewed:{" "}
            </dt>
            <dd className="inline">{formatReviewedAt(summary.lastReviewed)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

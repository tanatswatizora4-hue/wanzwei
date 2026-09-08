"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label, FieldHint } from "@/components/ui/input";
import { ProfessionSelect } from "@/components/app/profession-select";
import { RegulatoryBodySelect } from "@/components/app/regulatory-body-select";
import { VerificationDocumentField } from "@/components/app/professional/verification-document-field";
import { ProfessionalCredentialSummary } from "@/components/app/professional-credential-summary";
import { professionSupportsHpaAutoVerify } from "@/lib/professions";
import {
  isOtherRegulatoryBody,
  parseSelectableRegulatoryBody,
  regulatoryBodySupportsHpaCorroboration,
} from "@/lib/regulatory-bodies";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  latestSubmissionMessage,
  publicStateFromVerification,
  type PublicVerificationState,
} from "@/lib/verification/public-result";
import { publicCredentialLabel } from "@/lib/verification/public-credential";
import { isSensitiveVerificationDocument } from "@/lib/verification/document-purpose";
import type { User, Verification } from "@/lib/types";
import type { ProfessionalDocumentRow } from "@/lib/supabase/document-types";

function badgeTone(
  state: PublicVerificationState | "Registry Verified" | "Credentials Reviewed" | "Not verified",
): "success" | "amber" | "danger" | "slate" | "info" {
  switch (state) {
    case "Verified":
    case "Registry Verified":
    case "Credentials Reviewed":
      return "success";
    case "Rejected":
    case "Not verified":
      return "danger";
    case "Under Review":
    case "Pending":
      return "amber";
    default:
      return "slate";
  }
}

function latestDocument(
  documents: ProfessionalDocumentRow[],
  purpose: "identity" | "credential",
) {
  return documents.find((row) => row.purpose === purpose) ?? null;
}

export function VerificationCredentialsForm({
  defaultProfession,
  defaultRegisteringBody,
  defaultRegulatoryBodyOther,
  defaultRegistrationNumber,
  initialVerification,
  accountVerified,
  uploadsEnabled,
  initialDocuments = [],
  credentialUser,
}: {
  defaultProfession?: string;
  defaultRegisteringBody?: string;
  defaultRegulatoryBodyOther?: string;
  defaultRegistrationNumber?: string;
  initialVerification: Verification | null;
  accountVerified: boolean;
  uploadsEnabled: boolean;
  initialDocuments?: ProfessionalDocumentRow[];
  credentialUser?: Pick<
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
  const router = useRouter();
  const [profession, setProfession] = React.useState(
    defaultProfession ?? initialVerification?.profession ?? "",
  );
  const [registeringBody, setRegisteringBody] = React.useState(
    parseSelectableRegulatoryBody(
      defaultRegisteringBody ?? initialVerification?.registeringBody,
    ) ?? "",
  );
  const [regulatoryBodyOther, setRegulatoryBodyOther] = React.useState(
    defaultRegulatoryBodyOther ?? initialVerification?.regulatoryBodyOther ?? "",
  );
  const [registrationNumber, setRegistrationNumber] = React.useState(
    defaultRegistrationNumber ?? initialVerification?.registrationNumber ?? "",
  );
  const identitySeed = latestDocument(initialDocuments, "identity");
  const credentialSeed = latestDocument(initialDocuments, "credential");
  const [identityDocument, setIdentityDocument] = React.useState(
    identitySeed
      ? { id: identitySeed.id, file_name: identitySeed.file_name }
      : null,
  );
  const [credentialDocument, setCredentialDocument] = React.useState(
    credentialSeed
      ? { id: credentialSeed.id, file_name: credentialSeed.file_name }
      : null,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [latestStatus, setLatestStatus] = React.useState<PublicVerificationState>(
    publicStateFromVerification(initialVerification),
  );
  const [accountStatus, setAccountStatus] = React.useState(accountVerified);
  const [message, setMessage] = React.useState(
    latestSubmissionMessage(
      accountVerified,
      publicStateFromVerification(initialVerification),
    ),
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!identityDocument || !credentialDocument) {
      toast.error("Upload an identity document and a current practising certificate.");
      return;
    }
    if (identityDocument.id === credentialDocument.id) {
      toast.error("Identity and practising certificate files must be different documents.");
      return;
    }
    if (!registeringBody) {
      toast.error("Select a regulatory body.");
      return;
    }
    if (isOtherRegulatoryBody(registeringBody) && !regulatoryBodyOther.trim()) {
      toast.error("Enter the name of the regulatory body.");
      return;
    }
    if (!registrationNumber.trim()) {
      toast.error("Enter your professional registration number.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        profession,
        identityDocumentId: identityDocument.id,
        credentialDocumentId: credentialDocument.id,
        registeringBody,
        registrationNumber: registrationNumber.trim(),
      };
      if (isOtherRegulatoryBody(registeringBody)) {
        payload.regulatoryBodyOther = regulatoryBodyOther.trim();
      }
      const res = await fetch("/api/verifications/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        status?: PublicVerificationState;
        message?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Verification submit failed");
        return;
      }
      const nextStatus = json.status ?? "Under Review";
      const nextAccountVerified =
        accountStatus || nextStatus === "Verified";
      const nextMessage =
        json.message ??
        latestSubmissionMessage(nextAccountVerified, nextStatus);
      setLatestStatus(nextStatus);
      setAccountStatus(nextAccountVerified);
      setMessage(nextMessage);
      toast.success(nextMessage);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Verification submit failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const accountLabel = publicCredentialLabel({
    verified: accountStatus,
    credentialVerificationMethod: credentialUser?.credentialVerificationMethod,
  });
  const registrySupported = regulatoryBodySupportsHpaCorroboration(
    registeringBody,
    profession,
  );
  const otherSelected = isOtherRegulatoryBody(registeringBody);
  const hasSensitiveDocs = initialDocuments.some((row) =>
    isSensitiveVerificationDocument(row.purpose),
  );

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold">Professional verification</h2>
            <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
              Submit your profession, regulatory body, registration number, identity
              document, and current practising certificate. Wanzwei reviews this
              evidence and, where supported, corroborates registration against
              available regulatory records. Facilities cannot see these files.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge tone={badgeTone(accountLabel)} withDot>
              {accountLabel}
            </Badge>
            <Badge tone={badgeTone(latestStatus)} withDot>
              Latest submission: {latestStatus}
            </Badge>
          </div>
        </div>
        <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-500)]">
          {message}
        </p>
        {credentialUser ? (
          <div className="mt-3">
            <ProfessionalCredentialSummary user={credentialUser} />
          </div>
        ) : null}
        {hasSensitiveDocs ? (
          <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-500)]">
            Identity and practising certificate files stay in your private documents store.
          </p>
        ) : null}
        <Separator className="my-4" />
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="profession">Profession</Label>
            <ProfessionSelect
              name="profession"
              required
              value={profession}
              onValueChange={setProfession}
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="registeringBody">Regulatory / registering body</Label>
            <RegulatoryBodySelect
              required
              value={registeringBody}
              onValueChange={(value) => {
                setRegisteringBody(value);
                if (!isOtherRegulatoryBody(value)) setRegulatoryBodyOther("");
              }}
            />
            <FieldHint>
              {otherSelected
                ? "Other is never auto-verified. An administrator will review your documents."
                : profession && !professionSupportsHpaAutoVerify(profession)
                  ? "Wanzwei does not have an authoritative register for this profession yet. That does not reject you. Documents will be reviewed."
                  : registrySupported
                    ? "Where Wanzwei has a compatible register, it may corroborate this registration automatically."
                    : "Select the council that issued your practising certificate or licence."}
            </FieldHint>
          </div>
          {otherSelected ? (
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="regulatoryBodyOther">Name of regulatory body</Label>
              <Input
                id="regulatoryBodyOther"
                name="regulatoryBodyOther"
                value={regulatoryBodyOther}
                onChange={(event) => setRegulatoryBodyOther(event.target.value)}
                placeholder="Name of the registering body"
                required
              />
            </div>
          ) : null}
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="registrationNumber">Professional registration number</Label>
            <Input
              id="registrationNumber"
              name="registrationNumber"
              placeholder="Registration number as shown on your certificate"
              value={registrationNumber}
              onChange={(event) => setRegistrationNumber(event.target.value)}
              required
            />
          </div>
          <VerificationDocumentField
            label="Identity document"
            hint="National ID or passport. Used only to establish legal name and identity. Numbers are not stored."
            purpose="identity"
            enabled={uploadsEnabled}
            document={identityDocument}
            onUploaded={setIdentityDocument}
          />
          <VerificationDocumentField
            label="Current practising certificate / licence"
            hint="Current practising certificate or professional licence. A degree alone does not prove you are currently licensed to practise."
            purpose="credential"
            enabled={uploadsEnabled}
            document={credentialDocument}
            onUploaded={setCredentialDocument}
          />
          <div className="sm:col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={
                submitting ||
                !identityDocument ||
                !credentialDocument ||
                !profession ||
                !registeringBody ||
                !registrationNumber.trim() ||
                (otherSelected && !regulatoryBodyOther.trim())
              }
            >
              {submitting ? "Submitting…" : "Submit for verification"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

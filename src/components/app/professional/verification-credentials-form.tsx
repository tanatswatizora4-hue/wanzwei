"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label, FieldHint } from "@/components/ui/input";
import { ProfessionSelect } from "@/components/app/profession-select";
import { VerificationDocumentField } from "@/components/app/professional/verification-document-field";
import { professionSupportsHpaAutoVerify } from "@/lib/professions";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  HPA_BODY,
  accountVerificationLabel,
  latestSubmissionMessage,
  publicStateFromVerification,
  type PublicVerificationState,
} from "@/lib/verification/public-result";
import { isSensitiveVerificationDocument } from "@/lib/verification/document-purpose";
import type { Verification } from "@/lib/types";
import type { ProfessionalDocumentRow } from "@/lib/supabase/document-types";

function badgeTone(
  state: PublicVerificationState | "Verified" | "Not verified",
): "success" | "amber" | "danger" | "slate" | "info" {
  switch (state) {
    case "Verified":
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
  defaultRegistrationNumber,
  initialVerification,
  accountVerified,
  uploadsEnabled,
  initialDocuments = [],
}: {
  defaultProfession?: string;
  defaultRegisteringBody?: string;
  defaultRegistrationNumber?: string;
  initialVerification: Verification | null;
  accountVerified: boolean;
  uploadsEnabled: boolean;
  initialDocuments?: ProfessionalDocumentRow[];
}) {
  const router = useRouter();
  const [profession, setProfession] = React.useState(
    defaultProfession ?? initialVerification?.profession ?? "",
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
  const [accountStatus, setAccountStatus] = React.useState(
    accountVerified,
  );
  const [message, setMessage] = React.useState(
    latestSubmissionMessage(
      accountVerified,
      publicStateFromVerification(initialVerification),
    ),
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!identityDocument || !credentialDocument) {
      toast.error("Upload an identity document and a professional credential.");
      return;
    }
    if (identityDocument.id === credentialDocument.id) {
      toast.error("Identity and credential files must be different documents.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        profession,
        identityDocumentId: identityDocument.id,
        credentialDocumentId: credentialDocument.id,
      };
      const trimmedNumber = registrationNumber.trim();
      if (trimmedNumber) {
        payload.registeringBody = defaultRegisteringBody || HPA_BODY;
        payload.registrationNumber = trimmedNumber;
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

  const accountLabel = accountVerificationLabel(accountStatus);
  const hpaSupported = professionSupportsHpaAutoVerify(profession);
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
              Submit an identity document and a professional credential. Matching
              against the HPA register is used as extra evidence when a number is
              available. Facilities and other professionals cannot see these files.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge tone={badgeTone(accountLabel)} withDot>
              Account verification: {accountLabel}
            </Badge>
            <Badge tone={badgeTone(latestStatus)} withDot>
              Latest credential submission: {latestStatus}
            </Badge>
          </div>
        </div>
        <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-500)]">
          {message}
        </p>
        {hasSensitiveDocs ? (
          <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-500)]">
            Identity and credential files stay in your private documents store.
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
            <FieldHint>
              {profession && !hpaSupported
                ? "No HPA register family exists for this profession yet. That does not reject you. Documents will be reviewed."
                : "If you have an HPA registration number, include it as corroborating evidence. Document analysis plus registry evidence is decided server-side."}
            </FieldHint>
          </div>
          <VerificationDocumentField
            label="Identity document"
            hint="National ID or passport. Used only to establish legal name and identity."
            purpose="identity"
            enabled={uploadsEnabled}
            document={identityDocument}
            onUploaded={setIdentityDocument}
          />
          <VerificationDocumentField
            label="Professional credential"
            hint="Practising certificate, professional licence, registration certificate, qualification, or other credential. A degree alone does not prove you are currently licensed to practise."
            purpose="credential"
            enabled={uploadsEnabled}
            document={credentialDocument}
            onUploaded={setCredentialDocument}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="registeringBody">Registering body (optional)</Label>
            <Input
              id="registeringBody"
              name="registeringBody"
              value={defaultRegisteringBody || HPA_BODY}
              readOnly
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="registrationNumber">
              Registration number (optional)
            </Label>
            <Input
              id="registrationNumber"
              name="registrationNumber"
              placeholder="P01-6420-2026"
              value={registrationNumber}
              onChange={(event) => setRegistrationNumber(event.target.value)}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={
                submitting ||
                !identityDocument ||
                !credentialDocument ||
                !profession
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

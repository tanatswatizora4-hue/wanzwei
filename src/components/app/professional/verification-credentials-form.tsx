"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  HPA_BODY,
  accountVerificationLabel,
  latestSubmissionMessage,
  publicStateFromVerification,
  type PublicVerificationState,
} from "@/lib/verification/public-result";
import type { Verification } from "@/lib/types";

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

export function VerificationCredentialsForm({
  defaultProfession,
  defaultRegisteringBody,
  defaultRegistrationNumber,
  initialVerification,
  accountVerified,
}: {
  defaultProfession?: string;
  defaultRegisteringBody?: string;
  defaultRegistrationNumber?: string;
  initialVerification: Verification | null;
  accountVerified: boolean;
}) {
  const router = useRouter();
  const [profession, setProfession] = React.useState(
    defaultProfession ?? initialVerification?.profession ?? "",
  );
  const [registrationNumber, setRegistrationNumber] = React.useState(
    defaultRegistrationNumber ?? initialVerification?.registrationNumber ?? "",
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
    setSubmitting(true);
    try {
      const res = await fetch("/api/verifications/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          registeringBody: HPA_BODY,
          registrationNumber,
          profession,
        }),
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

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold">Professional verification</h2>
            <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
              Submit your HPA registration. Matching is checked server-side
              against the practitioner register.
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
        <Separator className="my-4" />
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="registeringBody">Registering body</Label>
            <Input
              id="registeringBody"
              name="registeringBody"
              value={defaultRegisteringBody || HPA_BODY}
              readOnly
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="registrationNumber">Registration number</Label>
            <Input
              id="registrationNumber"
              name="registrationNumber"
              placeholder="P01-6420-2026"
              value={registrationNumber}
              onChange={(event) => setRegistrationNumber(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="profession">Profession</Label>
            <Input
              id="profession"
              name="profession"
              placeholder="Pharmacist"
              value={profession}
              onChange={(event) => setProfession(event.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for verification"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

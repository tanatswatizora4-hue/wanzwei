"use client";

import Link from "next/link";

import { Card, CardBody } from "@/components/ui/card";

export function WorkspaceSettingsCard({
  hasProfessional,
  canAddFacility,
  canAddProfessional,
}: {
  hasProfessional: boolean;
  canAddFacility: boolean;
  canAddProfessional: boolean;
}) {
  if (!canAddFacility && !canAddProfessional) return null;

  return (
    <Card>
      <CardBody className="flex min-w-0 flex-col gap-3 pt-5">
        <h2 className="text-[15px] font-semibold">Profiles</h2>
        <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
          You can operate as yourself or as a facility from this same login. You
          do not need a second Wanzwei account.
        </p>
        {canAddFacility ? (
          <Link
            href="/workspaces/add"
            className="text-[13px] font-medium text-[color:var(--color-brand-700)] hover:underline"
          >
            Create or join a facility
          </Link>
        ) : null}
        {canAddProfessional && !hasProfessional ? (
          <Link
            href="/workspaces/add#professional"
            className="text-[13px] font-medium text-[color:var(--color-ink-700)] hover:underline"
          >
            Add Professional profile
          </Link>
        ) : null}
      </CardBody>
    </Card>
  );
}

"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createFacilityWorkspaceAction,
  createProfessionalWorkspaceAction,
} from "@/app/(app)/workspace/actions";
import { ProfessionSelect } from "@/components/app/profession-select";
import { RegulatoryBodySelect } from "@/components/app/regulatory-body-select";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { isOtherRegulatoryBody } from "@/lib/regulatory-bodies";
import { FacilityTypeSchema } from "@/lib/validation/auth";

const FACILITY_TYPES = FacilityTypeSchema.options;

export function WorkspaceSettingsCard({
  hasProfessional,
  canAddFacility,
  canAddProfessional,
}: {
  hasProfessional: boolean;
  canAddFacility: boolean;
  canAddProfessional: boolean;
}) {
  const [pending, setPending] = React.useState(false);
  const [body, setBody] = React.useState("");

  if (!canAddFacility && !canAddProfessional) return null;

  const run = async (
    event: React.FormEvent<HTMLFormElement>,
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
  ) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await action(new FormData(event.currentTarget));
      if (!result.ok) toast.error(result.error);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add workspace.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardBody className="flex min-w-0 flex-col gap-4 pt-5">
        <h2 className="text-[15px] font-semibold">Workspaces</h2>
        <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
          Add a professional or facility workspace to this account. Switching
          profiles does not change who owns jobs, listings, or certificates.
        </p>
        {canAddFacility ? (
          <form
            className="flex min-w-0 flex-col gap-3"
            onSubmit={(event) => run(event, createFacilityWorkspaceAction)}
          >
            <p className="text-[13px] font-medium">Add a facility workspace</p>
            <div>
              <Label htmlFor="organisationName">Organisation name</Label>
              <Input id="organisationName" name="organisationName" required />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" required />
            </div>
            <div>
              <Label htmlFor="facilityType">Facility type</Label>
              <select
                id="facilityType"
                name="facilityType"
                required
                className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
              >
                {FACILITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={pending} variant="secondary">
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Create facility workspace
            </Button>
          </form>
        ) : null}
        {canAddProfessional && !hasProfessional ? (
          <form
            className="flex min-w-0 flex-col gap-3"
            onSubmit={(event) => run(event, createProfessionalWorkspaceAction)}
          >
            <p className="text-[13px] font-medium">Add a professional profile</p>
            <ProfessionSelect name="profession" required />
            <div>
              <Label htmlFor="registeringBody">Regulatory body</Label>
              <RegulatoryBodySelect
                required
                onValueChange={setBody}
              />
            </div>
            {isOtherRegulatoryBody(body) ? (
              <div>
                <Label htmlFor="regulatoryBodyOther">Name of regulatory body</Label>
                <Input id="regulatoryBodyOther" name="regulatoryBodyOther" required />
              </div>
            ) : null}
            <Button type="submit" disabled={pending} variant="secondary">
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Create professional profile
            </Button>
          </form>
        ) : null}
      </CardBody>
    </Card>
  );
}

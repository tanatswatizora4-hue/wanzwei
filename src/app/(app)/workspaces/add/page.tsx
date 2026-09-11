import { acceptFacilityInvitationAction } from "@/app/(app)/facility/members/actions";
import { createFacilityWorkspaceAction } from "@/app/(app)/workspace/actions";
import { AddProfessionalProfileForm } from "@/components/app/add-professional-profile-form";
import { PageHeader } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label, FieldHint } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/session";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import { hasActiveProfessionalMembership } from "@/lib/auth/workspace-model";
import { FacilityTypeSchema } from "@/lib/validation/auth";

const FACILITY_TYPES = FacilityTypeSchema.options;

export default async function AddWorkspacePage() {
  const user = await requireUser();
  if (user.role === "admin") {
    return (
      <p className="text-[13px] text-[color:var(--color-ink-500)]">
        Admin is a system privilege, not a facility workspace.
      </p>
    );
  }
  const { memberships } = await resolveWorkspaceForUser(user);
  const hasProfessional = hasActiveProfessionalMembership(memberships);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Create or join a facility"
        description="Use this same Wanzwei login. You do not need a second account to operate a facility."
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardBody className="flex min-w-0 flex-col gap-4 pt-5">
            <div>
              <h2 className="text-[15px] font-semibold">Create a facility</h2>
              <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
                Register a healthcare organisation you own or manage.
              </p>
            </div>
            <form
              action={
                createFacilityWorkspaceAction as unknown as (
                  formData: FormData,
                ) => Promise<void>
              }
              className="flex min-w-0 flex-col gap-3"
            >
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
              <div>
                <Label htmlFor="premisesNumber">Premises registration number</Label>
                <Input id="premisesNumber" name="premisesNumber" autoComplete="off" />
                <FieldHint>
                  Optional. Submitting a number does not verify the facility.
                </FieldHint>
              </div>
              <Button type="submit">Create facility</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex min-w-0 flex-col gap-4 pt-5">
            <div>
              <h2 className="text-[15px] font-semibold">Join a facility</h2>
              <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
                Use an invitation from an organisation that has authorised you to
                manage its Wanzwei workspace.
              </p>
            </div>
            <form
              action={
                acceptFacilityInvitationAction as unknown as (
                  formData: FormData,
                ) => Promise<void>
              }
              className="flex min-w-0 flex-col gap-3"
            >
              <div>
                <Label htmlFor="token">Invitation link or token</Label>
                <Input
                  id="token"
                  name="token"
                  required
                  placeholder="Paste the invitation link or token"
                />
              </div>
              <Button type="submit" variant="secondary">
                Join facility
              </Button>
            </form>
            <p className="text-[12px] text-[color:var(--color-ink-500)]">
              You must be signed in with the email address the invitation was sent
              to.
            </p>
          </CardBody>
        </Card>
      </div>

      {!hasProfessional ? (
        <Card>
          <CardBody
            id="professional"
            className="flex min-w-0 flex-col gap-4 pt-5"
          >
            <div>
              <h2 className="text-[15px] font-semibold">Add Professional profile</h2>
              <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
                Use this same login to apply for jobs and complete CPD as
                yourself.
              </p>
            </div>
            <AddProfessionalProfileForm />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

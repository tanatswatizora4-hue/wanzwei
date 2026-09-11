import { acceptFacilityInvitationAction } from "@/app/(app)/facility/members/actions";
import { PageHeader } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const user = await requireUser();
  const { token } = await searchParams;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Join a facility"
        description="Facility membership lets you operate this organisation on Wanzwei. It does not represent employment."
      />
      <Card>
        <CardBody className="flex min-w-0 flex-col gap-3 pt-5">
          {user.role === "admin" ? (
            <p className="text-[13px] text-[color:var(--color-ink-500)]">
              Admin accounts cannot join facility workspaces.
            </p>
          ) : token ? (
            <form
              action={
                acceptFacilityInvitationAction as unknown as (
                  formData: FormData,
                ) => Promise<void>
              }
            >
              <input type="hidden" name="token" value={token} />
              <p className="text-[13px] text-[color:var(--color-ink-600)]">
                Continue as {user.email} to accept this invitation.
              </p>
              <Button type="submit" className="mt-4">
                Accept invitation
              </Button>
            </form>
          ) : (
            <p className="text-[13px] text-[color:var(--color-ink-500)]">
              This invitation link is missing a token.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

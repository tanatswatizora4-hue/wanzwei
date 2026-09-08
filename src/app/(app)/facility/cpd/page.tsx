import Link from "next/link";

import { switchWorkspaceAction } from "@/app/(app)/workspace/actions";
import { PageHeader } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import { hasActiveProfessionalMembership } from "@/lib/auth/workspace-model";

export default async function FacilityCpdPage() {
  const user = await requireRole(["facility"]);
  const { memberships } = await resolveWorkspaceForUser(user);
  const hasProfessional = hasActiveProfessionalMembership(memberships);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="CPD"
        description="Certificates and CPD history belong to a professional profile, not a facility workspace."
      />
      <Card>
        <CardBody className="flex min-w-0 flex-col gap-3 pt-5">
          {hasProfessional ? (
            <>
              <p className="text-[13px] text-[color:var(--color-ink-600)]">
                Switch to your professional profile to view CPD activities and
                certificates. Switching does not change certificate ownership.
              </p>
              <form
                action={
                  switchWorkspaceAction as unknown as (
                    formData: FormData,
                  ) => Promise<void>
                }
              >
                <input type="hidden" name="workspace" value="professional" />
                <Button type="submit" size="sm">
                  Switch to professional profile
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-[13px] text-[color:var(--color-ink-600)]">
                This account does not have a professional profile yet. Add one
                from Settings if you need CPD and certificates.
              </p>
              <Button size="sm" variant="secondary" asChild>
                <Link href="/facility/settings">Open settings</Link>
              </Button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

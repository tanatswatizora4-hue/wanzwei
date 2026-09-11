import { FacilityMembersManager } from "@/components/app/facility-members-manager";
import { PageHeader } from "@/components/app/topbar";
import { requireRole } from "@/lib/auth/session";
import { hasFacilityCapability } from "@/lib/auth/facility-capabilities";
import { getActiveFacilityContext } from "@/lib/facility-for-user";
import { listFacilityMembers } from "@/lib/repos/account-memberships";
import { listPendingInvitationsForFacility } from "@/lib/repos/facility-invitations";
import { redirect } from "next/navigation";

export default async function FacilityMembersPage() {
  const user = await requireRole(["facility"]);
  const context = await getActiveFacilityContext(user);
  if (!context) redirect("/workspaces/add");

  const canManage = hasFacilityCapability(
    context.membership.membershipRole,
    "manageMembers",
  );
  const members = await listFacilityMembers(context.facilityId);
  const pendingInvites = canManage
    ? await listPendingInvitationsForFacility(context.facilityId)
    : [];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Members"
        description="Members can help operate this facility on Wanzwei. Facility membership controls access to this workspace and does not represent employment at the organisation."
      />
      <FacilityMembersManager
        members={members}
        pendingInvites={pendingInvites}
        currentUserId={user.id}
        canManage={canManage}
      />
    </div>
  );
}

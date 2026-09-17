import { PageHeader } from "@/components/app/topbar";
import { FacilityNetworkManager } from "@/components/app/facility-network-manager";
import { requireRole } from "@/lib/auth/session";
import { hasFacilityCapability } from "@/lib/auth/facility-capabilities";
import { getActiveFacilityContext } from "@/lib/facility-for-user";
import { listFacilityProfessionalNetwork } from "@/lib/repos/facility-professional-network";
import { redirect } from "next/navigation";

export default async function FacilityNetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireRole(["facility"]);
  const context = await getActiveFacilityContext(user);
  if (!context) redirect("/workspaces/add");
  if (!hasFacilityCapability(context.membership.membershipRole, "viewProfessionalNetwork")) {
    redirect("/facility/dashboard");
  }

  const { q } = await searchParams;
  const canManage = hasFacilityCapability(
    context.membership.membershipRole,
    "manageProfessionalNetwork",
  );
  const members = await listFacilityProfessionalNetwork(context.facilityId, q);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Professional network"
        description="A facility-controlled talent pool and affiliation list. Network membership is not workspace access and does not change account memberships."
      />
      <FacilityNetworkManager members={members} canManage={canManage} />
    </div>
  );
}

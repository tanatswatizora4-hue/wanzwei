import { BroadcastComposer } from "@/components/app/broadcast-composer";
import { PageHeader } from "@/components/app/topbar";
import { requireRole } from "@/lib/auth/session";
import { hasFacilityCapability } from "@/lib/auth/facility-capabilities";
import { getActiveFacilityContext } from "@/lib/facility-for-user";
import { getFacility } from "@/lib/repos/facilities";
import { listJobsForFacility } from "@/lib/repos/jobs";
import { isGeminiConfigured } from "@/lib/verification/gemini/config";
import { redirect } from "next/navigation";

export default async function NewFacilityBroadcastPage() {
  const user = await requireRole(["facility"]);
  const context = await getActiveFacilityContext(user);
  if (!context) redirect("/workspaces/add");

  const canSendEmergency = hasFacilityCapability(
    context.membership.membershipRole,
    "manageEmergency",
  );
  const canSendRecruitment = hasFacilityCapability(
    context.membership.membershipRole,
    "createRecruitmentBroadcast",
  );
  if (!canSendEmergency && !canSendRecruitment) {
    redirect("/facility/broadcasts");
  }

  const [facility, jobs] = await Promise.all([
    getFacility(context.facilityId),
    listJobsForFacility(context.facilityId, 50),
  ]);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="New broadcast"
        description="Review filters, audience, and message before anything is sent. AI never sends on its own."
      />
      <BroadcastComposer
        defaultLocation={facility?.location ?? "Harare"}
        jobs={jobs.map((job) => ({ id: job.id, title: job.title }))}
        canSendEmergency={canSendEmergency}
        canSendRecruitment={canSendRecruitment}
        geminiConfigured={isGeminiConfigured()}
      />
    </div>
  );
}

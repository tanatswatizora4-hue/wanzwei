import { requireRole } from "@/lib/auth/session";
import { timeAgoLong } from "@/lib/format";
import { listApplicationsForFacility } from "@/lib/repos/applications";
import { hasFacilityCapability } from "@/lib/auth/facility-capabilities";
import { getActiveFacilityContext } from "@/lib/facility-for-user";
import { getFacility } from "@/lib/repos/facilities";
import { FacilityApplicationsClient } from "./applications-client";

export default async function FacilityApplicationsPage() {
  const user = await requireRole(["facility"]);
  const context = await getActiveFacilityContext(user);
  const facility = context ? await getFacility(context.facilityId) : null;
  const canManageApplicants = hasFacilityCapability(
    context?.membership.membershipRole,
    "manageApplicants",
  );
  const rows = facility
    ? await listApplicationsForFacility(facility.id, 200)
    : [];

  const applicants = rows.map(({ application, job, professional }) => ({
    id: application.id,
    name: professional?.name ?? "Candidate",
    role: job.title,
    jobId: job.id,
    profession: professional?.profession ?? "Professional",
    location: professional?.location ?? job.location,
    verified: professional?.verified === true,
    status: application.status,
    applied: timeAgoLong(application.appliedAt),
  }));

  return (
    <FacilityApplicationsClient
      applicants={applicants}
      canManage={canManageApplicants}
    />
  );
}

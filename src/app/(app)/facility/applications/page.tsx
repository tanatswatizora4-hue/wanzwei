import { requireRole } from "@/lib/auth/session";
import { timeAgoLong } from "@/lib/format";
import { listApplicationsForFacility } from "@/lib/repos/applications";
import { findFacilityForUserEmail } from "@/lib/repos/facilities";
import { FacilityApplicationsClient } from "./applications-client";

export default async function FacilityApplicationsPage() {
  const user = await requireRole(["facility"]);
  const facility = await findFacilityForUserEmail(user.email);
  const rows = facility
    ? await listApplicationsForFacility(facility.id, 200)
    : [];

  const applicants = rows.map(({ application, job, professional }) => ({
    id: application.id,
    name: professional?.name ?? "Candidate",
    role: job.title,
    profession: professional?.profession ?? "Professional",
    experience: "—",
    location: professional?.location ?? job.location,
    rating: 4.5,
    cpd: professional?.cpdCredits ?? 0,
    status: application.status,
    applied: timeAgoLong(application.appliedAt),
  }));

  return <FacilityApplicationsClient applicants={applicants} />;
}

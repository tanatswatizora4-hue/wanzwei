import { CpdView } from "@/components/app/cpd-view";
import { requireRole } from "@/lib/auth/session";
import { creditsFromCompletedEnrolments } from "@/lib/cpd/credits";
import { parseCpdSearchParams } from "@/lib/cpd/search";
import { listEnrolmentsForUser } from "@/lib/repos/course-enrolments";
import { listCourses } from "@/lib/repos/courses";

export default async function ProfessionalCpdPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    format?: string;
    tab?: string;
  }>;
}) {
  const user = await requireRole(["professional"]);
  const filters = parseCpdSearchParams(await searchParams);
  const [courses, enrolments] = await Promise.all([
    listCourses(200, filters),
    listEnrolmentsForUser(user.id),
  ]);
  const earnedCredits = creditsFromCompletedEnrolments(
    enrolments.map((item) => ({
      status: item.enrolment.status,
      credits: item.course.credits,
    })),
  );

  return (
    <CpdView
      courses={courses}
      enrolments={enrolments}
      filters={filters}
      earnedCredits={earnedCredits}
      creditTarget={user.cpdTarget}
      basePath="/professional/cpd"
      canEnrol
    />
  );
}

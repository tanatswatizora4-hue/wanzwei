import { CpdView } from "@/components/app/cpd-view";
import { listCourses } from "@/lib/repos/courses";
import { requireRole } from "@/lib/auth/session";

export default async function ProfessionalCpdPage() {
  const user = await requireRole(["professional"]);
  const courses = await listCourses();
  return (
    <CpdView
      courses={courses}
      credits={user.cpdCredits ?? 0}
      target={user.cpdTarget ?? 30}
    />
  );
}

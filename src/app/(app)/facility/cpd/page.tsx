import { CpdView } from "@/components/app/cpd-view";
import { listCourses } from "@/lib/repos/courses";
import { requireRole } from "@/lib/auth/session";

export default async function FacilityCpdPage() {
  await requireRole(["facility"]);
  const courses = await listCourses();
  const completed = courses
    .filter((c) => c.status === "completed")
    .reduce((sum, c) => sum + c.credits, 0);
  return <CpdView courses={courses} credits={completed} target={20} />;
}

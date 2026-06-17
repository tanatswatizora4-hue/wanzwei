import { CpdView } from "@/components/app/cpd-view";
import { listCourses } from "@/lib/repos/courses";
import { requireRole } from "@/lib/auth/session";

export default async function AdminCpdPage() {
  await requireRole(["admin"]);
  const courses = await listCourses();
  return <CpdView courses={courses} credits={28} target={40} />;
}

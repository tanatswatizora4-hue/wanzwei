import { AdminCourseDialog } from "@/components/app/admin-course-dialog";
import { CpdView } from "@/components/app/cpd-view";
import { requireRole } from "@/lib/auth/session";
import { parseCpdSearchParams } from "@/lib/cpd/search";
import { listCourses } from "@/lib/repos/courses";

export default async function AdminCpdPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    format?: string;
    tab?: string;
  }>;
}) {
  await requireRole(["admin"]);
  const filters = parseCpdSearchParams(await searchParams);
  const courses = await listCourses(200, filters);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex justify-end">
        <AdminCourseDialog />
      </div>
      <CpdView
        courses={courses}
        enrolments={[]}
        filters={{ ...filters, tab: "catalogue" }}
        earnedCredits={0}
        creditTarget={null}
        basePath="/admin/cpd"
        canEnrol={false}
        showCreditSummary={false}
      />
    </div>
  );
}

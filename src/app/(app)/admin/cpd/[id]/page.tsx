import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminCourseDialog } from "@/components/app/admin-course-dialog";
import { PageHeader } from "@/components/app/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { parseUuid } from "@/lib/ids";
import { getCourseById } from "@/lib/repos/courses";

export default async function AdminCpdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const courseId = parseUuid(id);
  if (!courseId) notFound();
  const course = await getCourseById(courseId);
  if (!course) notFound();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={course.title}
        description={`${course.provider} · ${course.credits} CPD credits`}
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminCourseDialog course={course} />
            <Button variant="secondary" size="sm" asChild>
              <Link href="/admin/cpd">
                <ArrowLeft className="h-3.5 w-3.5" /> Catalogue
              </Link>
            </Button>
          </div>
        }
      />
      <Card>
        <CardBody className="flex min-w-0 flex-col gap-3 pt-5">
          <div className="flex flex-wrap gap-2">
            <Badge>{course.category}</Badge>
            <Badge tone="sky">{course.format}</Badge>
            {course.recommended ? <Badge tone="brand">Recommended</Badge> : null}
          </div>
          <p className="text-[13px] text-[color:var(--color-ink-500)]">
            {course.duration}
            {course.location ? ` · ${course.location}` : ""}
          </p>
          <p className="whitespace-pre-wrap text-[14px] leading-6">
            {course.description || "No description published."}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

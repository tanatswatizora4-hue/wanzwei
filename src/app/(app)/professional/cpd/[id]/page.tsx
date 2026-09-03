import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, Clock, MapPin, Monitor } from "lucide-react";

import { CpdEnrolButtons } from "@/components/app/cpd-enrol-buttons";
import { PageHeader } from "@/components/app/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { parseUuid } from "@/lib/ids";
import { getEnrolmentForUserCourse } from "@/lib/repos/course-enrolments";
import { getCourseById } from "@/lib/repos/courses";

function formatWhen(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ProfessionalCpdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["professional"]);
  const { id } = await params;
  const courseId = parseUuid(id);
  if (!courseId) notFound();

  const course = await getCourseById(courseId);
  if (!course) notFound();
  const enrolment = await getEnrolmentForUserCourse(user.id, course.id);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={course.title}
        description={`${course.provider} · ${course.category}`}
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/professional/cpd">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to CPD
            </Link>
          </Button>
        }
      />

      <Card>
        <div
          className={`h-36 bg-gradient-to-br ${course.cover}`}
          aria-hidden
        />
        <CardBody className="flex min-w-0 flex-col gap-4 pt-5">
          <div className="flex flex-wrap gap-2">
            <Badge>{course.category}</Badge>
            <Badge tone="sky">{course.format}</Badge>
            {course.recommended ? <Badge tone="brand">Recommended</Badge> : null}
            {enrolment ? (
              <Badge tone={enrolment.status === "completed" ? "emerald" : "amber"}>
                {enrolment.status === "completed" ? "Completed" : "Registered"}
              </Badge>
            ) : null}
          </div>
          <dl className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-[color:var(--color-ink-400)]">Provider</dt>
              <dd className="mt-0.5 font-medium">{course.provider}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--color-ink-400)]">Credits</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1 font-medium">
                <Award className="h-3.5 w-3.5" /> {course.credits} CPD
              </dd>
            </div>
            <div>
              <dt className="text-[color:var(--color-ink-400)]">Duration</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {course.duration}
              </dd>
            </div>
            <div>
              <dt className="text-[color:var(--color-ink-400)]">Format</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1">
                <Monitor className="h-3.5 w-3.5" /> {course.format}
              </dd>
            </div>
            {course.location ? (
              <div>
                <dt className="text-[color:var(--color-ink-400)]">Location</dt>
                <dd className="mt-0.5 inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {course.location}
                </dd>
              </div>
            ) : null}
            {formatWhen(course.startsAt) ? (
              <div>
                <dt className="text-[color:var(--color-ink-400)]">Starts</dt>
                <dd className="mt-0.5">{formatWhen(course.startsAt)}</dd>
              </div>
            ) : null}
            {formatWhen(course.endsAt) ? (
              <div>
                <dt className="text-[color:var(--color-ink-400)]">Ends</dt>
                <dd className="mt-0.5">{formatWhen(course.endsAt)}</dd>
              </div>
            ) : null}
          </dl>
          {course.description ? (
            <p className="whitespace-pre-wrap text-[14px] leading-6 text-[color:var(--color-ink-700)]">
              {course.description}
            </p>
          ) : (
            <p className="text-[13px] text-[color:var(--color-ink-500)]">
              No further description was published for this opportunity.
            </p>
          )}
          <div className="rounded-[var(--radius-md)] bg-[color:var(--color-surface-muted)] px-3 py-3 text-[12.5px] text-[color:var(--color-ink-500)]">
            Registration is stored against your account. Marking complete is a
            self-recorded history entry. Wanzwei does not issue certificates or
            verify attendance.
          </div>
          <CpdEnrolButtons
            courseId={course.id}
            status={enrolment?.status ?? null}
          />
        </CardBody>
      </Card>
    </div>
  );
}

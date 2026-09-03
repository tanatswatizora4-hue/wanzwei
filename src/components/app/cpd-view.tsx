import Link from "next/link";
import { Award, Clock, GraduationCap, MapPin, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress";
import { PageHeader } from "@/components/app/topbar";
import { CpdSearchStrip } from "@/components/app/cpd-search-strip";
import { CpdEnrolButtons } from "@/components/app/cpd-enrol-buttons";
import { cn } from "@/lib/cn";
import { cpdCreditProgress } from "@/lib/cpd/credits";
import { cpdSearchQuery, type CpdSearchFilters } from "@/lib/cpd/search";
import type { Course, CourseEnrolment, CourseEnrolmentStatus } from "@/lib/types";

const CATEGORY_TONE: Record<string, "violet" | "emerald" | "amber" | "sky" | "rose"> = {
  Clinical: "rose",
  Compliance: "amber",
  Leadership: "violet",
  Tech: "sky",
  Wellbeing: "emerald",
};

function formatWhen(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CpdView({
  courses,
  enrolments,
  filters,
  earnedCredits,
  creditTarget,
  basePath,
  canEnrol,
  manageHref,
  showCreditSummary = true,
}: {
  courses: Course[];
  enrolments: Array<{ enrolment: CourseEnrolment; course: Course }>;
  filters: CpdSearchFilters;
  earnedCredits: number;
  creditTarget?: number | null;
  basePath: string;
  canEnrol: boolean;
  manageHref?: string;
  showCreditSummary?: boolean;
}) {
  const progress = cpdCreditProgress(earnedCredits, creditTarget);
  const byCourseId = new Map(
    enrolments.map((item) => [item.course.id, item.enrolment.status]),
  );
  const registered = enrolments.filter((item) => item.enrolment.status === "registered");
  const completed = enrolments.filter((item) => item.enrolment.status === "completed");
  const tab = filters.tab ?? "catalogue";
  const visibleCourses =
    tab === "registered"
      ? registered.map((item) => item.course)
      : tab === "completed"
        ? completed.map((item) => item.course)
        : courses;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Continuing Professional Development"
        description="Browse published CPD opportunities, register, and keep a record of activity you have completed."
        actions={
          manageHref ? (
            <Button size="sm" asChild>
              <Link href={manageHref}>Manage catalogue</Link>
            </Button>
          ) : null
        }
      />

      {showCreditSummary ? (
      <Card>
        <CardBody className="pt-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:gap-8">
            <div className="flex min-w-0 items-center gap-4 xl:flex-1">
              <ProgressRing
                value={progress.pct ?? 0}
                size={76}
                stroke={7}
                label={
                  <span className="flex flex-col items-center leading-none">
                    <span className="text-[14px] font-semibold tabular-nums">
                      {progress.earned}
                    </span>
                    <span className="mt-1 text-[9.5px] tabular-nums text-[color:var(--color-ink-400)]">
                      {progress.target != null ? `/ ${progress.target}` : "credits"}
                    </span>
                  </span>
                }
              />
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-400)]">
                  Completed enrolments
                </p>
                <p className="mt-1.5 text-[18px] font-semibold leading-tight tracking-tight">
                  {progress.target != null
                    ? `${progress.pct}% of stored target`
                    : `${progress.earned} CPD credits recorded`}
                </p>
                <p className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-500)]">
                  {progress.remaining != null
                    ? `${progress.remaining} credits remaining against your stored target`
                    : "Credits count only after you mark an enrolment complete. No certificates are issued here."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 xl:flex-shrink-0">
              <Stat label="Catalogue" value={courses.length} />
              <Stat label="Registered" value={registered.length} />
              <Stat label="Completed" value={completed.length} />
            </div>
          </div>
        </CardBody>
      </Card>
      ) : null}

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            (
              canEnrol
                ? ([
                    ["catalogue", "Catalogue", courses.length],
                    ["registered", "Registered", registered.length],
                    ["completed", "Completed", completed.length],
                  ] as const)
                : ([["catalogue", "Catalogue", courses.length]] as const)
            )
          ).map(([value, label, count]) => {
            const href = `${basePath}${cpdSearchQuery({ ...filters, tab: value })}`;
            const active = tab === value;
            return (
              <Link
                key={value}
                href={href}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full px-3 text-[13px] font-medium",
                  active
                    ? "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]"
                    : "text-[color:var(--color-ink-600)] hover:bg-white/70",
                )}
              >
                {label} ({count})
              </Link>
            );
          })}
        </div>
        <Card>
          <CardBody className="pt-5 pb-5">
            <CpdSearchStrip action={basePath} filters={filters} />
          </CardBody>
        </Card>
      </div>

      {visibleCourses.length === 0 ? (
        <Card>
          <EmptyState
            icon={<GraduationCap className="h-4 w-4" />}
            title={
              tab === "catalogue"
                ? "No CPD opportunities match these filters"
                : tab === "registered"
                  ? "No current registrations"
                  : "No completed CPD recorded yet"
            }
            description={
              tab === "catalogue"
                ? "Try another keyword, category, or format."
                : "Register from the catalogue to build a persisted activity history."
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              status={byCourseId.get(course.id) ?? null}
              href={`${basePath}/${course.id}`}
              canEnrol={canEnrol}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] px-3 py-2.5">
      <p className="text-[20px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 truncate text-[11.5px] text-[color:var(--color-ink-500)]">
        {label}
      </p>
    </div>
  );
}

function CourseCard({
  course,
  status,
  href,
  canEnrol,
}: {
  course: Course;
  status: CourseEnrolmentStatus | null;
  href: string;
  canEnrol: boolean;
}) {
  const when = formatWhen(course.startsAt);
  return (
    <Card className="card-hover flex min-w-0 flex-col overflow-hidden">
      <div
        className={`relative h-28 bg-gradient-to-br ${course.cover}`}
        aria-hidden
      >
        <div className="absolute right-3 top-3">
          <Badge tone={CATEGORY_TONE[course.category] ?? "slate"}>
            {course.category}
          </Badge>
        </div>
        {course.recommended ? (
          <div className="absolute left-3 top-3">
            <Badge tone="brand">Recommended</Badge>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
          {course.provider}
        </p>
        <h3 className="mt-1 text-[14px] font-semibold leading-tight tracking-tight">
          {course.title}
        </h3>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[color:var(--color-ink-500)]">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {course.duration}
          </span>
          <span className="inline-flex items-center gap-1">
            <Award className="h-3 w-3" /> {course.credits} CPD
          </span>
          <span className="inline-flex items-center gap-1">
            <Monitor className="h-3 w-3" /> {course.format}
          </span>
          {course.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {course.location}
            </span>
          ) : null}
          {when ? <span>{when}</span> : null}
        </div>
        {status ? (
          <p className="mt-3 text-[12px] text-[color:var(--color-ink-500)]">
            Status: {status === "completed" ? "Completed" : "Registered"}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          {canEnrol ? (
            <CpdEnrolButtons courseId={course.id} status={status} />
          ) : null}
          <Button variant="ghost" size="sm" asChild>
            <Link href={href}>Details</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

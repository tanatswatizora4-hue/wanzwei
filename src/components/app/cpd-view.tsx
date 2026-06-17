import Link from "next/link";
import { Award, Clock, Download, Filter, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Progress, ProgressRing } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/topbar";
import type { Course } from "@/lib/types";

const CATEGORY_TONE: Record<string, "violet" | "emerald" | "amber" | "sky" | "rose"> = {
  Clinical: "rose",
  Compliance: "amber",
  Leadership: "violet",
  Tech: "sky",
  Wellbeing: "emerald",
};

export function CpdView({
  courses,
  credits,
  target,
}: {
  courses: Course[];
  credits: number;
  target: number;
}) {
  const pct = Math.round((credits / target) * 100);
  const completed = courses.filter((c) => c.status === "completed");
  const inProgress = courses.filter((c) => c.status === "in_progress");
  const recommended = courses.filter((c) => c.recommended);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Continuing Professional Development"
        description="Track CPD credits, complete certified courses, and download certificates."
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter className="h-3.5 w-3.5" /> Filter
            </Button>
            <Button size="sm">
              <GraduationCap className="h-3.5 w-3.5" /> Browse catalogue
            </Button>
          </>
        }
      />

      <Card>
        <CardBody className="pt-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:gap-8">
            <div className="flex items-center gap-4 min-w-0 xl:flex-1">
              <ProgressRing
                value={pct}
                size={76}
                stroke={7}
                label={
                  <span className="flex flex-col items-center leading-none">
                    <span className="text-[14px] font-semibold tabular-nums">
                      {credits}
                    </span>
                    <span className="text-[9.5px] text-[color:var(--color-ink-400)] mt-1 tabular-nums">
                      / {target}
                    </span>
                  </span>
                }
              />
              <div className="min-w-0">
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-400)] font-semibold">
                  2026 Cycle
                </p>
                <p className="mt-1.5 text-[18px] font-semibold tracking-tight leading-tight">
                  {pct}% of target reached
                </p>
                <p className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-500)]">
                  {target - credits} credits remaining
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 xl:gap-3 xl:flex-shrink-0">
              <Stat label="Completed" value={completed.length} />
              <Stat label="In progress" value={inProgress.length} />
              <Stat label="Recommended" value={recommended.length} />
            </div>
          </div>
        </CardBody>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({courses.length})</TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({inProgress.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="recommended">
            Recommended ({recommended.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] px-3 py-2.5 min-w-0">
      <p className="text-[20px] font-semibold tracking-tight leading-none tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] text-[color:var(--color-ink-500)] truncate">
        {label}
      </p>
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  const isDone = course.status === "completed";
  return (
    <Card className="card-hover overflow-hidden flex flex-col">
      <div
        className={`relative h-28 bg-gradient-to-br ${course.cover}`}
        aria-hidden
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.18) 1px, transparent 0)",
            backgroundSize: "16px 16px",
          }}
        />
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
        <p className="text-[10.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold">
          {course.provider}
        </p>
        <h3 className="mt-1 text-[14px] font-semibold leading-tight tracking-tight">
          {course.title}
        </h3>
        <div className="mt-2.5 flex items-center gap-3 text-[12px] text-[color:var(--color-ink-500)]">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {course.duration}
          </span>
          <span className="text-[color:var(--color-ink-300)]">·</span>
          <span className="inline-flex items-center gap-1">
            <Award className="h-3 w-3" /> {course.credits} CPD
          </span>
        </div>

        <div className="mt-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[color:var(--color-ink-500)]">
              {isDone ? "Completed" : `${course.progress}% complete`}
            </span>
            {isDone ? (
              <Badge tone="success" withDot>
                Certified
              </Badge>
            ) : null}
          </div>
          <Progress value={course.progress} />
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          {isDone ? (
            <Button variant="secondary" size="sm" className="flex-1">
              <Download className="h-3.5 w-3.5" /> Certificate
            </Button>
          ) : (
            <Button size="sm" className="flex-1">
              {course.progress > 0 ? "Continue" : "Start course"}
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="#">Details</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

import Link from "next/link";
import {
  MapPin,
  Filter,
  Users,
  Clock3,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { ProfessionalJobsSearchStrip } from "@/components/app/professional-jobs-search-strip";
import { ApplyJobButton } from "@/components/app/apply-job-button";
import { SaveJobButton } from "@/components/app/save-job-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FacilityLogo } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { timeAgoLong } from "@/lib/format";
import { listOpenJobsWithFacilityForProfessional } from "@/lib/repos/jobs";
import { requireRole } from "@/lib/auth/session";

export default async function JobsPage() {
  const user = await requireRole(["professional"]);
  const items = await listOpenJobsWithFacilityForProfessional(user.id, 200);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Browse Jobs"
        description="Find your next role across Zimbabwe's leading hospitals, clinics and pharmacies."
        actions={
          <>
            <Button variant="secondary" size="sm" disabled title="Filters coming soon">
              <Filter className="h-3.5 w-3.5" /> Filters
            </Button>
          </>
        }
      />

      <Card>
        <CardBody className="pt-5 pb-5">
          <ProfessionalJobsSearchStrip />
        </CardBody>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map(({ job, facility: f }) => {
          return (
            <article
              key={job.id}
              className="card card-hover group relative flex flex-col overflow-hidden"
            >
              {/* Row 1 — header: logo + title + save */}
              <header className="flex items-start gap-3 px-5 pt-4 pb-3.5">
                <FacilityLogo
                  initials={f.initials}
                  gradient={f.logoColor}
                  size={38}
                  className="rounded-[10px]"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/professional/jobs/${job.id}`}
                    className="font-display text-[15.5px] font-semibold tracking-tight text-[color:var(--color-ink-900)] hover:text-[color:var(--color-brand-700)] line-clamp-1"
                  >
                    {job.title}
                  </Link>
                  <p className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-500)] truncate">
                    {f.name}
                  </p>
                </div>
                <SaveJobButton
                  jobId={job.id}
                  jobTitle={job.title}
                  defaultSaved={Boolean(job.saved)}
                />
              </header>

              {/* Row 2 — meta strip with vertical dividers */}
              <div className="mx-5 flex items-center gap-3 rounded-[10px] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)]/70 px-3 py-2 text-[12px]">
                <span className="inline-flex items-center gap-1.5 text-[color:var(--color-ink-700)]">
                  <MapPin className="h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
                  <span className="font-medium">{job.location}</span>
                </span>
                <span className="h-3 w-px bg-[color:var(--color-border-default)]" />
                <Badge tone="emerald" className="px-1.5 py-0">
                  {job.type}
                </Badge>
                {job.salary ? (
                  <>
                    <span className="ml-auto inline-flex items-center gap-1 font-display num text-[12.5px] font-semibold text-[color:var(--color-ink-900)] tabular-nums">
                      {job.salary}
                    </span>
                  </>
                ) : null}
              </div>

              {/* Row 3 — description + tags */}
              <div className="px-5 pt-3.5 pb-4 flex-1">
                <p className="line-clamp-2 text-[13px] leading-relaxed text-[color:var(--color-ink-500)]">
                  {job.description}
                </p>
                {job.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.tags.map((t) => (
                      <Badge key={t} tone="slate">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Row 4 — footer: meta on left, apply on right */}
              <footer className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)]/50 px-5 py-2.5">
                <div className="flex items-center gap-3 text-[11.5px] text-[color:var(--color-ink-500)]">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {timeAgoLong(job.postedAt)}
                  </span>
                  <span className="h-3 w-px bg-[color:var(--color-border-default)]" />
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className="num font-medium text-[color:var(--color-ink-700)] tabular-nums">
                      {job.applicants}
                    </span>{" "}
                    applicants
                  </span>
                </div>
                <ApplyJobButton
                  jobId={job.id}
                  jobTitle={job.title}
                  defaultApplied={Boolean(job.applied)}
                  verified={user.verified === true}
                />
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  MapPin,
  Users,
} from "lucide-react";

import { ApplyJobButton } from "@/components/app/apply-job-button";
import { SaveJobButton } from "@/components/app/save-job-button";
import { PageHeader } from "@/components/app/topbar";
import { FacilityLogo } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { timeAgoLong } from "@/lib/format";
import {
  parseProfessionalJobId,
  presentProfessionalJobDetail,
} from "@/lib/jobs/professional-job-detail";
import { getJobWithFacilityForProfessional } from "@/lib/repos/jobs";

export default async function ProfessionalJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["professional"]);
  const { id } = await params;
  const jobId = parseProfessionalJobId(id);
  if (!jobId) notFound();

  const row = await getJobWithFacilityForProfessional(jobId, user.id);
  const detail = presentProfessionalJobDetail(row);
  if (detail.status === "not_found") notFound();

  const { job, facility, isOpen } = detail;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={job.title}
        description={`${facility.name} · ${job.location}`}
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/professional/jobs">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to jobs
            </Link>
          </Button>
        }
      />

      <Card>
        <CardBody className="pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <FacilityLogo
                initials={facility.initials}
                gradient={facility.logoColor}
                size={48}
              />
              <div className="min-w-0">
                <h2 className="text-[18px] font-semibold tracking-tight">
                  {job.title}
                </h2>
                <p className="mt-0.5 text-[13px] text-[color:var(--color-ink-500)]">
                  {facility.name}
                  {facility.verified ? " · Verified facility" : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={job.status} />
                  <Badge tone="emerald">{job.type}</Badge>
                  <span className="inline-flex items-center gap-1 text-[12px] text-[color:var(--color-ink-500)]">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SaveJobButton
                jobId={job.id}
                jobTitle={job.title}
                defaultSaved={Boolean(job.saved)}
              />
              <ApplyJobButton
                jobId={job.id}
                jobTitle={job.title}
                defaultApplied={Boolean(job.applied)}
                verified={user.verified === true}
                acceptingApplications={isOpen}
                size="md"
              />
            </div>
          </div>

          {!isOpen ? (
            <p className="mt-4 rounded-[var(--radius-sm)] bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
              This role is closed and is no longer accepting applications.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-4 text-[12.5px] text-[color:var(--color-ink-500)]">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              Posted {timeAgoLong(job.postedAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="tabular-nums font-medium text-[color:var(--color-ink-700)]">
                {job.applicants}
              </span>{" "}
              applicants
            </span>
            {job.salary ? (
              <span className="font-medium text-[color:var(--color-ink-800)]">
                {job.salary}
              </span>
            ) : null}
          </div>

          {job.tags.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {job.tags.map((tag) => (
                <Badge key={tag} tone="slate">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-6">
            <h3 className="text-[14px] font-semibold">About this role</h3>
            <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[color:var(--color-ink-600)]">
              {job.description.trim()
                ? job.description
                : "No additional description was provided for this role."}
            </p>
          </div>

          <div className="mt-6 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] p-4">
            <h3 className="text-[13px] font-semibold">Facility</h3>
            <p className="mt-1 text-[13px] text-[color:var(--color-ink-700)]">
              {facility.name}
            </p>
            <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
              {facility.type} · {facility.location}
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

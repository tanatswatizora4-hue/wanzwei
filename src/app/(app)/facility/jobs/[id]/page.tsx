import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FacilityJobMenu } from "@/components/app/facility-job-menu";
import { PageHeader } from "@/components/app/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { resolveFacilityIdForUser } from "@/lib/facility-for-user";
import { timeAgoLong } from "@/lib/format";
import { parseUuid } from "@/lib/ids";
import { facilityApplicationPath } from "@/lib/jobs/paths";
import { listApplicationsForJob } from "@/lib/repos/applications";
import { getJobForFacility } from "@/lib/repos/jobs";

export default async function FacilityJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["facility"]);
  const { id } = await params;
  const jobId = parseUuid(id);
  if (!jobId) notFound();

  const facilityId = await resolveFacilityIdForUser(user);
  if (!facilityId) notFound();

  const job = await getJobForFacility(jobId, facilityId);
  if (!job) notFound();

  const applicants = await listApplicationsForJob(job.id, facilityId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={job.title}
        description={`${job.location} · ${job.type}`}
        meta={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/facility/jobs">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to jobs
            </Link>
          </Button>
        }
        actions={
          <>
            <StatusBadge status={job.status} />
            <FacilityJobMenu
              jobId={job.id}
              jobTitle={job.title}
              status={job.status}
            />
          </>
        }
      />

      <Card>
        <CardBody className="pt-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Applicants
              </dt>
              <dd className="mt-1 text-[15px] font-semibold tabular-nums">
                {job.applicants}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Posted
              </dt>
              <dd className="mt-1 text-[13px]">{timeAgoLong(job.postedAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Salary
              </dt>
              <dd className="mt-1 text-[13px]">{job.salary ?? "Not listed"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Status
              </dt>
              <dd className="mt-1">
                <StatusBadge status={job.status} />
              </dd>
            </div>
          </dl>
          {job.description ? (
            <p className="mt-5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[color:var(--color-ink-600)]">
              {job.description}
            </p>
          ) : null}
          {job.tags.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {job.tags.map((tag) => (
                <Badge key={tag} tone="slate">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-5">
          <h2 className="text-[14px] font-semibold">Applicants</h2>
          {applicants.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Applications for this role will appear here."
            />
          ) : (
            <ul className="mt-3 divide-y divide-[color:var(--color-border-default)]">
              {applicants.map(({ application, professional }) => (
                <li key={application.id} className="flex items-center gap-3 py-3">
                  <Avatar name={professional?.name ?? "Candidate"} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={facilityApplicationPath(application.id)}
                      className="font-semibold hover:text-[color:var(--color-brand-700)]"
                    >
                      {professional?.name ?? "Candidate"}
                    </Link>
                    <p className="text-[12px] text-[color:var(--color-ink-500)]">
                      {professional?.profession ?? "Professional"} ·{" "}
                      {timeAgoLong(application.appliedAt)}
                    </p>
                  </div>
                  <StatusBadge status={application.status} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

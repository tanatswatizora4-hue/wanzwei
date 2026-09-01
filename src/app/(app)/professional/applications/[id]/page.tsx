import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

import { PageHeader } from "@/components/app/topbar";
import { FacilityLogo } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { timeAgoLong } from "@/lib/format";
import { parseUuid } from "@/lib/ids";
import { professionalJobPath } from "@/lib/jobs/paths";
import { getApplicationForProfessional } from "@/lib/repos/applications";

export default async function ProfessionalApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["professional"]);
  const { id } = await params;
  const applicationId = parseUuid(id);
  if (!applicationId) notFound();

  const row = await getApplicationForProfessional(applicationId, user.id);
  if (!row) notFound();

  const { application, job, facility } = row;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={job.title}
        description={`${facility.name} · ${job.location}`}
        meta={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/professional/applications">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to applications
            </Link>
          </Button>
        }
        actions={<StatusBadge status={application.status} />}
      />

      <Card>
        <CardBody className="pt-5">
          <div className="flex items-start gap-3">
            <FacilityLogo
              initials={facility.initials}
              gradient={facility.logoColor}
              size={44}
              className="rounded-[10px]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{facility.name}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] text-[color:var(--color-ink-500)]">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="slate">{job.type}</Badge>
                {job.salary ? <Badge tone="emerald">{job.salary}</Badge> : null}
              </div>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Status
              </dt>
              <dd className="mt-1">
                <StatusBadge status={application.status} />
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Applied
              </dt>
              <dd className="mt-1 text-[13px] text-[color:var(--color-ink-700)]">
                {timeAgoLong(application.appliedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Last update
              </dt>
              <dd className="mt-1 text-[13px] text-[color:var(--color-ink-700)]">
                {timeAgoLong(application.updatedAt)}
              </dd>
            </div>
          </dl>

          {job.description ? (
            <div className="mt-6">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Role
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[color:var(--color-ink-600)]">
                {job.description}
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <Button size="sm" variant="secondary" asChild>
              <Link href={professionalJobPath(job.id)}>View job posting</Link>
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

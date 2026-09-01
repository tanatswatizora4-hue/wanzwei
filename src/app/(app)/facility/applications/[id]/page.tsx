import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ApplicationStatusSelect } from "@/components/app/application-status-select";
import { PageHeader } from "@/components/app/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { resolveFacilityIdForUser } from "@/lib/facility-for-user";
import { timeAgoLong } from "@/lib/format";
import { parseUuid } from "@/lib/ids";
import { facilityJobPath } from "@/lib/jobs/paths";
import { getApplicationForFacility } from "@/lib/repos/applications";

export default async function FacilityApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["facility"]);
  const { id } = await params;
  const applicationId = parseUuid(id);
  if (!applicationId) notFound();

  const facilityId = await resolveFacilityIdForUser(user);
  if (!facilityId) notFound();

  const row = await getApplicationForFacility(applicationId, facilityId);
  if (!row) notFound();

  const { application, job, professional } = row;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={professional?.name ?? "Applicant"}
        description={`${job.title} · ${professional?.profession ?? "Professional"}`}
        meta={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/facility/applications">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to applicants
            </Link>
          </Button>
        }
        actions={<StatusBadge status={application.status} />}
      />

      <Card>
        <CardBody className="pt-5">
          <div className="flex items-start gap-3">
            <Avatar name={professional?.name ?? "Candidate"} size={44} />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">
                {professional?.name ?? "Candidate"}
              </p>
              <p className="text-[13px] text-[color:var(--color-ink-500)]">
                {professional?.profession ?? "Professional"}
                {professional?.location ? ` · ${professional.location}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge
                  tone={professional?.verified ? "success" : "slate"}
                  withDot
                >
                  {professional?.verified ? "Verified" : "Not verified"}
                </Badge>
              </div>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Applied
              </dt>
              <dd className="mt-1 text-[13px]">
                {timeAgoLong(application.appliedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Last update
              </dt>
              <dd className="mt-1 text-[13px]">
                {timeAgoLong(application.updatedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Status
              </dt>
              <dd className="mt-1">
                <ApplicationStatusSelect
                  applicationId={application.id}
                  value={application.status}
                />
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <Button size="sm" variant="secondary" asChild>
              <Link href={facilityJobPath(job.id)}>View job</Link>
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

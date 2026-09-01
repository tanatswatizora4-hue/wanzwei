import Link from "next/link";
import type { ReactNode } from "react";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { FacilityNewJobDialog } from "@/components/app/facility-new-job-dialog";
import { FacilityJobMenu } from "@/components/app/facility-job-menu";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { timeAgoLong } from "@/lib/format";
import { facilityJobPath } from "@/lib/jobs/paths";
import { requireRole } from "@/lib/auth/session";
import { findFacilityForUserEmail } from "@/lib/repos/facilities";
import { listJobsForFacility } from "@/lib/repos/jobs";
import type { JobStatus } from "@/lib/types";

export default async function FacilityJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; status?: string }>;
}) {
  const user = await requireRole(["facility"]);
  const { new: newParam, status: statusParam } = await searchParams;
  const facility = await findFacilityForUserEmail(user.email);
  const allJobs = facility ? await listJobsForFacility(facility.id, 100) : [];
  const statusFilter =
    statusParam === "Open" || statusParam === "Closed"
      ? (statusParam as JobStatus)
      : undefined;
  const jobs = statusFilter
    ? allJobs.filter((job) => job.status === statusFilter)
    : allJobs;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jobs"
        description="Manage your active postings and closed roles."
        actions={
          <>
            <div className="flex gap-1 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white p-0.5 text-[12.5px]">
              <StatusLink href="/facility/jobs" active={!statusFilter}>
                All
              </StatusLink>
              <StatusLink
                href="/facility/jobs?status=Open"
                active={statusFilter === "Open"}
              >
                Open
              </StatusLink>
              <StatusLink
                href="/facility/jobs?status=Closed"
                active={statusFilter === "Closed"}
              >
                Closed
              </StatusLink>
            </div>
            <FacilityNewJobDialog
              defaultLocation={facility?.location ?? "Harare"}
              defaultOpen={newParam === "1"}
            />
          </>
        }
      />

      <Card>
        {jobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-4 w-4" />}
            title={facility ? "No jobs yet" : "Facility profile required"}
            description={
              facility
                ? "Post a role to start receiving applications from verified professionals."
                : "Complete your facility profile in Settings before posting jobs."
            }
            action={
              facility ? (
                <FacilityNewJobDialog
                  defaultLocation={facility.location}
                  defaultOpen={false}
                />
              ) : (
                <Button size="sm" asChild>
                  <Link href="/facility/settings">Open settings</Link>
                </Button>
              )
            }
          />
        ) : (
          <CardBody className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Applicants</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Link
                        href={facilityJobPath(job.id)}
                        className="font-semibold text-[color:var(--color-ink-900)] hover:text-[color:var(--color-brand-700)]"
                      >
                        {job.title}
                      </Link>
                      <p className="text-[11px] text-[color:var(--color-ink-400)]">
                        {job.location} · {job.salary ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge tone="slate">{job.type}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{job.applicants}</TableCell>
                    <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                      {timeAgoLong(job.postedAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <FacilityJobMenu
                        jobId={job.id}
                        jobTitle={job.title}
                        status={job.status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        )}
      </Card>
    </div>
  );
}

function StatusLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[6px] px-2.5 py-1 font-medium ${
        active
          ? "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]"
          : "text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-800)]"
      }`}
    >
      {children}
    </Link>
  );
}

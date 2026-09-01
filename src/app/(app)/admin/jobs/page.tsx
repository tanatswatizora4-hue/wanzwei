import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { FacilityLogo } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { timeAgoLong } from "@/lib/format";
import { listJobsWithFacility } from "@/lib/repos/jobs";
import { requireRole } from "@/lib/auth/session";
import type { JobStatus } from "@/lib/types";

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["admin"]);
  const { status: statusParam } = await searchParams;
  const statusFilter =
    statusParam === "Open" || statusParam === "Closed"
      ? (statusParam as JobStatus)
      : undefined;
  const all = await listJobsWithFacility(100);
  const jobs = statusFilter
    ? all.filter(({ job }) => job.status === statusFilter)
    : all;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jobs overview"
        description="Every role posted on Wanzwei across all facilities."
        actions={
          <div className="flex gap-1 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white p-0.5 text-[12.5px]">
            <StatusLink href="/admin/jobs" active={!statusFilter}>
              All
            </StatusLink>
            <StatusLink href="/admin/jobs?status=Open" active={statusFilter === "Open"}>
              Open
            </StatusLink>
            <StatusLink href="/admin/jobs?status=Closed" active={statusFilter === "Closed"}>
              Closed
            </StatusLink>
          </div>
        }
      />

      <Card>
        {jobs.length === 0 ? (
          <EmptyState
            title="No jobs"
            description="Facility job postings will appear here for oversight."
          />
        ) : (
        <CardBody className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map(({ job: j, facility: f }) => (
                <TableRow key={j.id}>
                  <TableCell>
                    <p className="font-semibold text-[color:var(--color-ink-900)]">
                      {j.title}
                    </p>
                    <p className="text-[11px] text-[color:var(--color-ink-400)]">
                      {j.location} · {j.salary ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FacilityLogo
                        initials={f.initials}
                        gradient={f.logoColor}
                        size={22}
                      />
                      <span>{f.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge tone="slate">{j.type}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{j.applicants}</TableCell>
                  <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                    {timeAgoLong(j.postedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={j.status} />
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

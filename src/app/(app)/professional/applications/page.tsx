import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FacilityLogo } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { timeAgoLong } from "@/lib/format";
import { professionalApplicationPath } from "@/lib/jobs/paths";
import { requireRole } from "@/lib/auth/session";
import { listApplicationsForProfessional } from "@/lib/repos/applications";

export default async function ApplicationsPage() {
  const user = await requireRole(["professional"]);
  const apps = await listApplicationsForProfessional(user.email, 100);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Applications"
        description="Track the status of every role you've applied to."
      />

      <Card>
        {apps.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-4 w-4" />}
            title="No applications yet"
            description="When you apply for a role, it will appear here so you can track status."
            action={
              <Button size="sm" asChild>
                <Link href="/professional/jobs">Browse jobs</Link>
              </Button>
            }
          />
        ) : (
        <CardBody className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map(({ application: a, job, facility: f }) => {
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <FacilityLogo
                          initials={f.initials}
                          gradient={f.logoColor}
                          size={28}
                        />
                        <div>
                          <p className="font-semibold text-[color:var(--color-ink-900)]">
                            {job.title}
                          </p>
                          <p className="text-[11.5px] text-[color:var(--color-ink-400)]">
                            {job.type} · {job.location}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{f.name}</TableCell>
                    <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                      {timeAgoLong(a.appliedAt)}
                    </TableCell>
                    <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                      {timeAgoLong(a.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={professionalApplicationPath(a.id)}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
        )}
      </Card>
    </div>
  );
}

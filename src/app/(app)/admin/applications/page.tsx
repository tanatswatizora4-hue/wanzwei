import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar, FacilityLogo } from "@/components/ui/avatar";
import { ApplicationStatusSelect } from "@/components/app/application-status-select";
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
import { listApplicationsWithDetails } from "@/lib/repos/applications";
import { requireRole } from "@/lib/auth/session";

export default async function AdminApplicationsPage() {
  await requireRole(["admin"]);
  const applications = await listApplicationsWithDetails(100);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Applications overview"
        description="All platform-wide applications and pipeline activity."
      />

      <Card>
        {applications.length === 0 ? (
          <EmptyState
            title="No applications"
            description="Applications submitted by professionals will appear here."
          />
        ) : (
          <CardBody className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Applied to</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map(({ application: a, professional, job, facility: f }) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={professional?.name ?? "Candidate"} size={28} />
                        <div>
                          <p className="font-semibold">{professional?.name ?? "—"}</p>
                          <p className="text-[11px] text-[color:var(--color-ink-400)]">
                            {professional?.profession ?? "Professional"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-[color:var(--color-ink-900)]">
                        {job.title}
                      </p>
                      <p className="text-[11px] text-[color:var(--color-ink-400)]">
                        {job.type}
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
                    <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                      {timeAgoLong(a.appliedAt)}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusSelect
                        applicationId={a.id}
                        value={a.status}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-[11px] text-[color:var(--color-ink-400)]">
                        {professional?.email}
                      </span>
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

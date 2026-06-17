import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { FacilityNewJobDialog } from "@/components/app/facility-new-job-dialog";
import { FacilityJobMenu } from "@/components/app/facility-job-menu";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";import { timeAgoLong } from "@/lib/format";
import { requireRole } from "@/lib/auth/session";
import { findFacilityForUserEmail } from "@/lib/repos/facilities";
import { listJobsForFacility } from "@/lib/repos/jobs";

export default async function FacilityJobsPage() {
  const user = await requireRole(["facility"]);
  const facility = await findFacilityForUserEmail(user.email);
  const jobs = facility ? await listJobsForFacility(facility.id, 100) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jobs"
        description="Manage your active postings, drafts and closed roles."
        actions={
          <>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
                <TabsTrigger value="draft">Drafts</TabsTrigger>
              </TabsList>
            </Tabs>
            <FacilityNewJobDialog
              defaultLocation={facility?.location ?? "Harare"}
            />
          </>
        }
      />

      <Card>
        <CardBody className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <p className="font-semibold text-[color:var(--color-ink-900)]">
                      {job.title}
                    </p>
                    <p className="text-[11px] text-[color:var(--color-ink-400)]">
                      {job.location} · {job.salary ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge tone="slate">{job.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {["KM", "TN", "RD"].map((i, ix) => (
                          <Avatar
                            key={ix}
                            name={i}
                            size={20}
                            className="ring-2 ring-white"
                            gradient="bg-gradient-to-br from-slate-400 to-slate-600"
                          />
                        ))}
                      </div>
                      <span className="text-[12.5px] tabular-nums">
                        {job.applicants}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[12.5px] tabular-nums">
                    {Math.round(job.applicants * 18.6)}
                  </TableCell>
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
      </Card>
    </div>
  );
}

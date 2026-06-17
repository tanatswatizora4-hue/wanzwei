import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { FacilityLogo } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default async function AdminJobsPage() {
  await requireRole(["admin"]);
  const jobs = await listJobsWithFacility(100);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jobs overview"
        description="Every role posted on Wanzwei across all facilities."
        actions={
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
              <TabsTrigger value="flagged">Flagged</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <Card>
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
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map(({ job: j, facility: f }) => {
                return (
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
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Audit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

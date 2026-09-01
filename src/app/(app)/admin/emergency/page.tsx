import { Siren } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
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
import { requireRole } from "@/lib/auth/session";
import { listEmergencyAlertsForAdmin } from "@/lib/repos/emergency-alerts";

export default async function AdminEmergencyPage() {
  await requireRole(["admin"]);
  const alerts = await listEmergencyAlertsForAdmin(200);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Emergency alerts"
        description="Read-only oversight of facility locum alerts and responses."
      />
      <Card>
        {alerts.length === 0 ? (
          <EmptyState
            icon={<Siren className="h-4 w-4" />}
            title="No emergency alerts"
            description="Facility emergency locum requests will appear here."
          />
        ) : (
          <CardBody className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility</TableHead>
                  <TableHead>Profession</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const accepted = alert.recipients.filter((r) => r.status === "Accepted").length;
                  const declined = alert.recipients.filter((r) => r.status === "Declined").length;
                  const pending = alert.recipients.filter((r) => r.status === "Pending").length;
                  return (
                    <TableRow key={alert.id}>
                      <TableCell className="font-semibold">{alert.facilityName}</TableCell>
                      <TableCell>{alert.profession}</TableCell>
                      <TableCell>{alert.location}</TableCell>
                      <TableCell>
                        <StatusBadge status={alert.status} />
                      </TableCell>
                      <TableCell className="text-[12px] text-[color:var(--color-ink-500)]">
                        <Badge tone="slate">{alert.matchedCount} sent</Badge>{" "}
                        {accepted} accepted · {declined} declined · {pending} pending
                      </TableCell>
                      <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                        {timeAgoLong(alert.createdAt)}
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

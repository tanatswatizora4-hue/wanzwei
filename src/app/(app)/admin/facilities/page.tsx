import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { listFacilitiesForAdmin } from "@/lib/repos/facilities";

export default async function AdminFacilitiesPage() {
  await requireRole(["admin"]);
  const rows = await listFacilitiesForAdmin(200);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Facilities"
        description="Read-only oversight of organisations on Wanzwei."
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-4 w-4" />}
            title="No facilities"
            description="Facility accounts created at signup will appear here."
          />
        ) : (
          <CardBody className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ facility, contactName, contactEmail }) => (
                  <TableRow key={facility.id}>
                    <TableCell className="font-semibold">{facility.name}</TableCell>
                    <TableCell>{facility.type}</TableCell>
                    <TableCell>{facility.location}</TableCell>
                    <TableCell>
                      <p>{contactName ?? "—"}</p>
                      <p className="text-[11px] text-[color:var(--color-ink-400)]">
                        {contactEmail ?? ""}
                      </p>
                    </TableCell>
                    <TableCell className="tabular-nums">{facility.openRoles}</TableCell>
                    <TableCell>
                      <Badge tone={facility.verified ? "success" : "amber"} withDot>
                        {facility.verified ? "Verified" : "Unverified"}
                      </Badge>
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

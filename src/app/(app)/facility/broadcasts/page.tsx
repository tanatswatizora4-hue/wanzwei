import Link from "next/link";
import { Megaphone } from "lucide-react";

import { PageHeader } from "@/components/app/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
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
import { hasFacilityCapability } from "@/lib/auth/facility-capabilities";
import { BROADCAST_TYPE_LABELS } from "@/lib/broadcasts/network-types";
import { timeAgoLong } from "@/lib/format";
import { getActiveFacilityContext } from "@/lib/facility-for-user";
import { listBroadcastsForFacility } from "@/lib/repos/workforce-broadcasts";
import { redirect } from "next/navigation";

export default async function FacilityBroadcastsPage() {
  const user = await requireRole(["facility"]);
  const context = await getActiveFacilityContext(user);
  if (!context) redirect("/workspaces/add");

  const canSend =
    hasFacilityCapability(context.membership.membershipRole, "createRecruitmentBroadcast") ||
    hasFacilityCapability(context.membership.membershipRole, "manageEmergency");
  const broadcasts = await listBroadcastsForFacility(context.facilityId);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Workforce broadcasts"
        description="Target locum, internal, and emergency staffing messages. AI can suggest filters. A person always reviews and sends."
        actions={
          canSend ? (
            <Button size="sm" asChild>
              <Link href="/facility/broadcasts/new">New broadcast</Link>
            </Button>
          ) : null
        }
      />

      <Card>
        {broadcasts.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="h-4 w-4" />}
            title="No broadcasts yet"
            description="Create a targeted message for your professional network or a verified audience."
            action={
              canSend ? (
                <Button size="sm" asChild>
                  <Link href="/facility/broadcasts/new">New broadcast</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <CardBody className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broadcast</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((broadcast) => (
                  <TableRow key={broadcast.id}>
                    <TableCell>
                      <p className="font-semibold">{broadcast.title}</p>
                      <p className="text-[11px] text-[color:var(--color-ink-400)]">
                        {broadcast.location ?? "Location not set"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge tone={broadcast.type === "emergency" ? "rose" : "brand"}>
                        {BROADCAST_TYPE_LABELS[broadcast.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {broadcast.matchedRecipientCount}
                    </TableCell>
                    <TableCell>
                      <Badge tone={broadcast.status === "sent" ? "emerald" : "slate"}>
                        {broadcast.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                      {broadcast.sentAt ? timeAgoLong(broadcast.sentAt) : "—"}
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

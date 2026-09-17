import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

import { PageHeader } from "@/components/app/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { BROADCAST_TYPE_LABELS } from "@/lib/broadcasts/network-types";
import { getBroadcastForProfessionalRecipient } from "@/lib/repos/workforce-broadcasts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ProfessionalOpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["professional"]);
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const opportunity = await getBroadcastForProfessionalRecipient({
    broadcastId: id,
    professionalUserId: user.id,
  });
  if (!opportunity) notFound();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={opportunity.title}
        description={opportunity.facilityName ?? "Facility opportunity"}
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/professional/opportunities">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to opportunities
            </Link>
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-col gap-4 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={opportunity.type === "emergency" ? "rose" : "brand"}>
              {BROADCAST_TYPE_LABELS[opportunity.type]}
            </Badge>
            {opportunity.location ? (
              <span className="inline-flex items-center gap-1 text-[12px] text-[color:var(--color-ink-500)]">
                <MapPin className="h-3.5 w-3.5" />
                {opportunity.location}
              </span>
            ) : null}
            {opportunity.positionsNeeded ? (
              <span className="text-[12px] text-[color:var(--color-ink-500)]">
                {opportunity.positionsNeeded} position
                {opportunity.positionsNeeded === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[color:var(--color-ink-700)]">
            {opportunity.message}
          </p>
          {opportunity.shiftStart || opportunity.shiftEnd ? (
            <p className="text-[13px] text-[color:var(--color-ink-500)]">
              {opportunity.shiftStart
                ? new Date(opportunity.shiftStart).toLocaleString("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Start TBC"}
              {opportunity.shiftEnd
                ? ` → ${new Date(opportunity.shiftEnd).toLocaleString("en", {
                    timeStyle: "short",
                  })}`
                : ""}
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

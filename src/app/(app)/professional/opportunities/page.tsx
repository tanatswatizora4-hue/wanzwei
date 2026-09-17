import Link from "next/link";
import { Briefcase } from "lucide-react";

import { PageHeader } from "@/components/app/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { BROADCAST_TYPE_LABELS } from "@/lib/broadcasts/network-types";
import { timeAgoLong } from "@/lib/format";
import { listBroadcastsForProfessional } from "@/lib/repos/workforce-broadcasts";

export default async function ProfessionalOpportunitiesPage() {
  const user = await requireRole(["professional"]);
  const opportunities = await listBroadcastsForProfessional(user.id);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Opportunities"
        description="Targeted locum, internal, and staffing messages sent to you. Private broadcasts are not publicly listed."
      />

      {opportunities.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Briefcase className="h-4 w-4" />}
            title="No targeted opportunities yet"
            description="When a facility sends you a locum or staffing broadcast, it will appear here."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {opportunities.map((opportunity) => (
            <Card key={opportunity.id}>
              <CardBody className="flex flex-col gap-2 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={opportunity.type === "emergency" ? "rose" : "brand"}>
                    {BROADCAST_TYPE_LABELS[opportunity.type]}
                  </Badge>
                  {opportunity.location ? (
                    <span className="text-[12px] text-[color:var(--color-ink-500)]">
                      {opportunity.location}
                    </span>
                  ) : null}
                </div>
                <Link
                  href={`/professional/opportunities/${opportunity.id}`}
                  className="font-display text-[16px] font-semibold hover:text-[color:var(--color-brand-700)]"
                >
                  {opportunity.title}
                </Link>
                <p className="line-clamp-2 text-[13px] text-[color:var(--color-ink-600)]">
                  {opportunity.message}
                </p>
                <p className="text-[12px] text-[color:var(--color-ink-400)]">
                  {opportunity.facilityName ?? "Facility"}
                  {opportunity.sentAt ? ` · ${timeAgoLong(opportunity.sentAt)}` : ""}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

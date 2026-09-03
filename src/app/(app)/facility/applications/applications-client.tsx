"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateApplicationStatusAction } from "@/app/(app)/applications/actions";
import { ApplicationStatusSelect } from "@/components/app/application-status-select";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { facilityApplicationPath } from "@/lib/jobs/paths";
import type { ApplicationStatus } from "@/lib/types";

export type FacilityApplicant = {
  id: string;
  name: string;
  role: string;
  jobId: string;
  profession: string;
  location: string;
  verified: boolean;
  status: ApplicationStatus;
  applied: string;
};

const PIPELINE: ApplicationStatus[] = [
  "Under Review",
  "Screening",
  "Shortlisted",
  "Interview",
  "Offer",
];

function pipelineStage(status: ApplicationStatus): ApplicationStatus {
  if (status === "Hired" || status === "Rejected") return "Offer";
  if (PIPELINE.includes(status)) return status;
  return "Under Review";
}

export function FacilityApplicationsClient({
  applicants: initialApplicants,
}: {
  applicants: FacilityApplicant[];
}) {
  const router = useRouter();
  const [statusOverrides, setStatusOverrides] = React.useState<
    Record<string, ApplicationStatus>
  >({});
  const [activeId, setActiveId] = React.useState<string | null>(
    initialApplicants[0]?.id ?? null,
  );
  const [pending, setPending] = React.useState<ApplicationStatus | null>(null);

  const applicants = initialApplicants.map((applicant) => ({
    ...applicant,
    status: statusOverrides[applicant.id] ?? applicant.status,
  }));
  const active =
    applicants.find((applicant) => applicant.id === activeId) ??
    applicants[0] ??
    null;

  const updateStatus = async (id: string, status: ApplicationStatus) => {
    setPending(status);
    const formData = new FormData();
    formData.set("applicationId", id);
    formData.set("status", status);
    const result = await updateApplicationStatusAction(formData);
    if (result.ok) {
      setStatusOverrides((prev) => ({ ...prev, [id]: status }));
      toast.success("Application status updated");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setPending(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Applicants"
        description="Review applications for your facility's jobs."
      />

      {applicants.length === 0 ? (
        <Card>
          <EmptyState
            title="No applications yet"
            description="When professionals apply to your jobs, they will appear here."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-[color:var(--color-border-default)]">
                {applicants.map((applicant) => (
                  <li key={applicant.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(applicant.id)}
                      className={`flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left ${
                        applicant.id === active?.id
                          ? "bg-[color:var(--color-brand-50)]/60"
                          : "hover:bg-[color:var(--color-surface-muted)]"
                      }`}
                    >
                      <Avatar name={applicant.name} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{applicant.name}</p>
                        <p className="truncate text-[12px] text-[color:var(--color-ink-500)]">
                          {applicant.role} · {applicant.location}
                        </p>
                      </div>
                      <StatusBadge status={applicant.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          {active ? (
            <ApplicantDetail
              applicant={active}
              pending={pending}
              runUpdate={(status) => void updateStatus(active.id, status)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ApplicantDetail({
  applicant,
  pending,
  runUpdate,
}: {
  applicant: FacilityApplicant;
  pending: ApplicationStatus | null;
  runUpdate: (status: ApplicationStatus) => void;
}) {
  const stageIdx = PIPELINE.indexOf(pipelineStage(applicant.status));

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex items-start gap-3">
          <Avatar name={applicant.name} size={44} />
          <div className="min-w-0 flex-1">
            <Link
              href={facilityApplicationPath(applicant.id)}
              className="text-[15px] font-semibold hover:text-[color:var(--color-brand-700)]"
            >
              {applicant.name}
            </Link>
            <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
              {applicant.profession} · {applicant.location}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone={applicant.verified ? "success" : "slate"} withDot>
                {applicant.verified ? "Verified" : "Not verified"}
              </Badge>
              <Badge tone="slate">{applicant.role}</Badge>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[12px] text-[color:var(--color-ink-500)]">
          Applied {applicant.applied}
        </p>

        <div className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] p-3">
          <p className="text-[10.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold">
            Pipeline
          </p>
          <div className="mt-2 flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 [-webkit-overflow-scrolling:touch]">
            {PIPELINE.map((p) => {
              const here = PIPELINE.indexOf(p);
              const done = here <= stageIdx;
              return (
                <div
                  key={p}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] text-center font-medium ${done ? "bg-[color:var(--color-brand-600)] text-white" : "bg-[color:var(--color-ink-900)]/[0.06] text-[color:var(--color-ink-500)]"}`}
                >
                  {p}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[10.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold">
            Status
          </p>
          <div className="mt-2">
            <ApplicationStatusSelect
              key={`${applicant.id}-${applicant.status}`}
              applicationId={applicant.id}
              value={applicant.status}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={Boolean(pending) || applicant.status === "Shortlisted"}
            onClick={() => runUpdate("Shortlisted")}
          >
            {pending === "Shortlisted" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}{" "}
            Shortlist
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-[color:var(--color-danger-700)] hover:bg-rose-50"
            disabled={Boolean(pending) || applicant.status === "Rejected"}
            onClick={() => runUpdate("Rejected")}
          >
            {pending === "Rejected" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}{" "}
            Decline
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

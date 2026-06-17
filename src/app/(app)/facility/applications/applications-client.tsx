"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  MessageSquare,
  Calendar,
  CheckCircle2,
  X,
  Star,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { updateApplicationStatusAction } from "@/app/(app)/applications/actions";
import { ApplicationStatusSelect } from "@/components/app/application-status-select";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApplicationStatus } from "@/lib/types";

export type FacilityApplicant = {
  id: string;
  name: string;
  role: string;
  profession: string;
  experience: string;
  location: string;
  rating: number;
  cpd: number;
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

  const applicants = initialApplicants.map((applicant) => ({
    ...applicant,
    status: statusOverrides[applicant.id] ?? applicant.status,
  }));
  const active =
    applicants.find((applicant) => applicant.id === activeId) ??
    applicants[0] ??
    null;

  const updateStatus = async (id: string, status: ApplicationStatus) => {
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
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Applicants"
        description="Manage your pipeline — from new applications to hires."
        actions={
          <Button variant="secondary" size="sm" disabled title="Filters coming soon">
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
        }
      />

      <Card>
        <CardBody className="pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
              <Input placeholder="Search applicants by name or skill" className="pl-9" />
            </div>
            <Select defaultValue="all-roles">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-roles">All roles</SelectItem>
                <SelectItem value="rn">Registered Nurse</SelectItem>
                <SelectItem value="co">Clinical Officer</SelectItem>
                <SelectItem value="pharm">Pharmacy Tech</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-status">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All statuses</SelectItem>
                {PIPELINE.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
                <SelectItem value="Hired">Hired</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-5 gap-2">
        {PIPELINE.map((p) => {
          const count = applicants.filter(
            (a) => pipelineStage(a.status) === p,
          ).length;
          const tone =
            p === "Under Review"
              ? "bg-emerald-50 text-emerald-700"
              : p === "Screening"
                ? "bg-sky-50 text-sky-700"
                : p === "Shortlisted"
                  ? "bg-amber-50 text-amber-700"
                  : p === "Interview"
                    ? "bg-violet-50 text-violet-700"
                    : "bg-slate-100 text-slate-700";
          return (
            <div
              key={p}
              className={`rounded-[var(--radius-md)] px-3 py-2.5 ${tone}`}
            >
              <p className="text-[10.5px] uppercase tracking-wider opacity-80">
                {p}
              </p>
              <p className="text-[18px] font-semibold tracking-tight mt-0.5">
                {count}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardBody className="p-0">
            {applicants.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-[color:var(--color-ink-500)]">
                No applications yet.
              </p>
            ) : (
              <ul className="divide-y divide-[color:var(--color-border-default)]">
                {applicants.map((a) => (
                  <li
                    key={a.id}
                    onClick={() => setActiveId(a.id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${active?.id === a.id ? "bg-[color:var(--color-brand-50)]/60" : "hover:bg-[color:var(--color-ink-900)]/[0.025]"}`}
                  >
                    <Avatar name={a.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] font-semibold">{a.name}</p>
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-[color:var(--color-ink-500)]">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          {a.rating}
                        </span>
                      </div>
                      <p className="text-[12px] text-[color:var(--color-ink-500)] truncate">
                        {a.role} · {a.experience} · {a.location}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={a.status} />
                      <span className="text-[10.5px] text-[color:var(--color-ink-400)]">
                        Applied {a.applied}
                      </span>
                    </div>
                    <ChevronRight className="hidden lg:block h-3.5 w-3.5 text-[color:var(--color-ink-300)]" />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <ApplicantDetail applicant={active} onUpdateStatus={updateStatus} />
      </div>
    </div>
  );
}

function ApplicantDetail({
  applicant,
  onUpdateStatus,
}: {
  applicant: FacilityApplicant | null;
  onUpdateStatus: (id: string, status: ApplicationStatus) => Promise<void>;
}) {
  const [pending, setPending] = React.useState<ApplicationStatus | null>(null);

  const runUpdate = async (status: ApplicationStatus) => {
    if (!applicant || pending) return;
    setPending(status);
    try {
      await onUpdateStatus(applicant.id, status);
    } finally {
      setPending(null);
    }
  };

  if (!applicant) {
    return (
      <Card className="flex items-center justify-center min-h-[300px] text-[color:var(--color-ink-400)]">
        Select an applicant to view details
      </Card>
    );
  }

  const stage = pipelineStage(applicant.status);
  const stageIdx = PIPELINE.indexOf(stage);

  return (
    <Card className="overflow-hidden">
      <CardBody>
        <div className="flex items-center gap-3">
          <Avatar name={applicant.name} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold">{applicant.name}</p>
              <Badge tone="success" withDot>
                Verified
              </Badge>
            </div>
            <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
              {applicant.role} · {applicant.experience} · {applicant.location}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] p-3">
          <p className="text-[10.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold">
            Pipeline
          </p>
          <div className="mt-2 flex gap-1">
            {PIPELINE.map((p) => {
              const here = PIPELINE.indexOf(p);
              const done = here <= stageIdx;
              return (
                <div
                  key={p}
                  className={`flex-1 rounded-full px-2 py-1 text-[10.5px] text-center font-medium ${done ? "bg-[color:var(--color-brand-600)] text-white" : "bg-[color:var(--color-ink-900)]/[0.06] text-[color:var(--color-ink-500)]"}`}
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

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Stat label="Rating" value={applicant.rating} />
          <Stat label="CPD" value={applicant.cpd} />
          <Stat label="Years" value={applicant.experience} />
        </div>

        <div className="mt-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
            Profile summary
          </p>
          <p className="mt-2 text-[13px] text-[color:var(--color-ink-500)] leading-relaxed">
            {applicant.experience} of {applicant.profession.toLowerCase()} experience
            across tertiary and private facilities. Strong references and active
            CPD record. Available immediately for {applicant.role} roles.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={Boolean(pending)}
            onClick={() => runUpdate("Shortlisted")}
          >
            {pending === "Shortlisted" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}{" "}
            Shortlist
          </Button>
          <Button size="sm" variant="secondary">
            <Calendar className="h-3.5 w-3.5" /> Schedule interview
          </Button>
          <Button size="sm" variant="secondary">
            <MessageSquare className="h-3.5 w-3.5" /> Message
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-[color:var(--color-danger-700)] hover:bg-rose-50"
            disabled={Boolean(pending)}
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

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white px-3 py-2.5 text-center">
      <p className="text-[17px] font-semibold tracking-tight leading-none">
        {value}
      </p>
      <p className="mt-1 text-[10.5px] uppercase tracking-wider text-[color:var(--color-ink-400)]">
        {label}
      </p>
    </div>
  );
}

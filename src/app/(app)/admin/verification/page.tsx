import Link from "next/link";
import { ShieldCheck, FileText, AlertCircle, Check } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
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
import { adminVerificationPath } from "@/lib/jobs/paths";
import { listVerifications } from "@/lib/repos/verifications";
import { requireRole } from "@/lib/auth/session";
import { AdminVerificationRowActions } from "@/components/app/admin/verification/verification-row-actions";
import type { VerificationStatus } from "@/lib/types";

const STATUSES: Array<{ value: "" | VerificationStatus; label: string }> = [
  { value: "", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Under Review", label: "Under Review" },
  { value: "Verified", label: "Verified" },
  { value: "Rejected", label: "Rejected" },
];

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["admin"]);
  const { status: statusParam } = await searchParams;
  const statusFilter = STATUSES.find((s) => s.value === statusParam)?.value || "";
  const [filtered, all] = await Promise.all([
    listVerifications(200, statusFilter || undefined),
    statusFilter ? listVerifications(200) : Promise.resolve(null),
  ]);
  const countsSource = all ?? filtered;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Verification queue"
        description="Review credential submissions and approve verified professionals."
        actions={
          <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white p-0.5 text-[12.5px]">
            {STATUSES.map((s) => (
              <Link
                key={s.label}
                href={s.value ? `/admin/verification?status=${encodeURIComponent(s.value)}` : "/admin/verification"}
                className={`rounded-[6px] px-2.5 py-1 font-medium ${
                  statusFilter === s.value
                    ? "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]"
                    : "text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-800)]"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: "Pending", value: countsSource.filter((v) => v.status === "Pending").length, tone: "amber" as const, icon: <ShieldCheck className="h-4 w-4" /> },
          { label: "Under Review", value: countsSource.filter((v) => v.status === "Under Review").length, tone: "info" as const, icon: <FileText className="h-4 w-4" /> },
          { label: "Verified", value: countsSource.filter((v) => v.status === "Verified").length, tone: "success" as const, icon: <Check className="h-4 w-4" /> },
          { label: "Rejected", value: countsSource.filter((v) => v.status === "Rejected").length, tone: "danger" as const, icon: <AlertCircle className="h-4 w-4" /> },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="pt-5 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-700)]">
                {s.icon}
              </div>
              <div>
                <p className="text-[11.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold">
                  {s.label}
                </p>
                <p className="text-[24px] font-semibold tracking-tight mt-0.5 leading-none">
                  {s.value}
                </p>
                <Badge tone={s.tone} withDot className="mt-2">
                  Live
                </Badge>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-4 w-4" />}
            title="No verification cases"
            description="Submitted practitioner verifications will appear here."
          />
        ) : (
        <CardBody className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Practitioner</TableHead>
                <TableHead>Profession</TableHead>
                <TableHead>Registering body</TableHead>
                <TableHead>Registration no.</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={v.name} size={32} />
                      <div>
                        <Link
                          href={adminVerificationPath(v.id)}
                          className="font-semibold text-[color:var(--color-ink-900)] hover:text-[color:var(--color-brand-700)]"
                        >
                          {v.name}
                        </Link>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{v.profession}</TableCell>
                  <TableCell>{v.registeringBody ?? "—"}</TableCell>
                  <TableCell className="font-mono text-[12px]">
                    {v.registrationNumber ?? "—"}
                  </TableCell>
                  <TableCell>
                    {v.matchOutcome ? (
                      <Badge tone="slate">{v.matchOutcome.replaceAll("_", " ")}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                    {timeAgoLong(v.submittedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AdminVerificationRowActions
                      verificationId={v.id}
                      status={v.status}
                    />
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

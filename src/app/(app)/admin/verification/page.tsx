import {
  ShieldCheck,
  FileText,
  AlertCircle,
  Check,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
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
import { listVerifications } from "@/lib/repos/verifications";
import { requireRole } from "@/lib/auth/session";
import { AdminVerificationRowActions } from "@/components/app/admin/verification/verification-row-actions";

export default async function AdminVerificationPage() {
  await requireRole(["admin"]);
  const verifications = await listVerifications(100);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Verification queue"
        description="Review credential submissions and approve verified professionals."
        actions={
          <>
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="review">Under Review</TabsTrigger>
                <TabsTrigger value="verified">Verified</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="secondary" size="sm" disabled title="Filters coming soon">
              <Filter className="h-3.5 w-3.5" /> Filters
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: "Pending", value: verifications.filter((v) => v.status === "Pending").length, tone: "amber" as const, icon: <ShieldCheck className="h-4 w-4" /> },
          { label: "Under Review", value: verifications.filter((v) => v.status === "Under Review").length, tone: "info" as const, icon: <FileText className="h-4 w-4" /> },
          { label: "Verified", value: verifications.filter((v) => v.status === "Verified").length, tone: "success" as const, icon: <Check className="h-4 w-4" /> },
          { label: "Flags raised", value: verifications.filter((v) => v.flags && v.flags.length > 0).length, tone: "danger" as const, icon: <AlertCircle className="h-4 w-4" /> },
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
        <CardBody className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Profession</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verifications.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={v.name} size={32} />
                      <div>
                        <p className="font-semibold text-[color:var(--color-ink-900)]">
                          {v.name}
                        </p>
                        <p className="text-[11px] text-[color:var(--color-ink-400)]">
                          ID: {v.userId}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{v.profession}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-[12.5px] text-[color:var(--color-ink-500)]">
                      <FileText className="h-3 w-3" /> {v.documentCount} files
                    </span>
                  </TableCell>
                  <TableCell>
                    {v.flags && v.flags.length > 0 ? (
                      <Badge tone="danger" withDot>
                        {v.flags[0]}
                      </Badge>
                    ) : (
                      <span className="text-[12.5px] text-[color:var(--color-ink-400)]">
                        —
                      </span>
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
      </Card>
    </div>
  );
}

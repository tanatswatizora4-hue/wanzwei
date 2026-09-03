import {
  FileText,
  Download,
  FileBadge,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import type { ProfessionalDocumentRow } from "@/lib/supabase/document-types";
import { listProfessionalDocuments } from "@/lib/supabase/documents-repo";
import { ProfessionalDocumentsUploadButton } from "@/components/app/professional/professional-documents-upload-button";
import { ProfessionalDocumentsDeleteButton } from "@/components/app/professional/professional-documents-delete-button";

function docTypeFromRow(row: ProfessionalDocumentRow): {
  label: string;
  tone: "violet" | "sky" | "emerald" | "amber" | "slate";
} {
  if (row.content_type === "application/pdf") {
    return { label: "PDF", tone: "violet" };
  }
  if (
    row.content_type === "image/jpeg" ||
    row.content_type === "image/png"
  ) {
    return { label: "Image", tone: "sky" };
  }
  return { label: "File", tone: "slate" };
}

function docStatusFromUser(user: { verified?: boolean }): "Verified" | "Pending" {
  return user.verified ? "Verified" : "Pending";
}

export default async function DocumentsPage() {
  const user = await requireRole(["professional"]);
  const uploadsEnabled = isSupabaseConfigured();
  const documents = uploadsEnabled
    ? await listProfessionalDocuments(user.id)
    : [];
  const statusForAll = docStatusFromUser(user);
  const verified = statusForAll === "Verified" ? documents.length : 0;
  const pending = statusForAll === "Pending" ? documents.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documents"
        description="Your verified credentials, certificates and references."
        actions={
          <ProfessionalDocumentsUploadButton enabled={uploadsEnabled} />
        }
      />

      <Card>
        <div className="grid grid-cols-3 divide-x divide-[color:var(--color-border-default)]">
          <StatInline
            icon={<FileBadge className="h-3.5 w-3.5" />}
            label="Total documents"
            value={documents.length}
          />
          <StatInline
            icon={
              <span className="size-2 rounded-full bg-emerald-500 inline-block" />
            }
            label="Verified"
            value={verified}
          />
          <StatInline
            icon={
              <span className="size-2 rounded-full bg-amber-500 inline-block" />
            }
            label="Pending review"
            value={pending}
          />
        </div>
      </Card>

      <Card>
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileBadge className="h-4 w-4" />}
            title="No documents yet"
            description="Upload licences and credentials so facilities and administrators can review them."
          />
        ) : (
        <CardBody className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Size</TableHead>
                <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell text-right">
                  Shared
                </TableHead>
                <TableHead className="w-px"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => {
                const type = docTypeFromRow(d);
                const status = statusForAll;
                return (
                  <TableRow key={d.id}>
                  <TableCell className="max-w-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-500)]">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[color:var(--color-ink-900)]">
                          {d.file_name}
                        </p>
                        <p className="truncate text-[11.5px] text-[color:var(--color-ink-400)] md:hidden">
                          {type.label} · — ·{" "}
                          {format(new Date(d.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge tone={type.tone}>{type.label}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums text-[color:var(--color-ink-500)]">
                    —
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-[color:var(--color-ink-500)]">
                    {format(new Date(d.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      tone={status === "Verified" ? "success" : "amber"}
                      withDot
                    >
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums text-[color:var(--color-ink-500)]">
                    —
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-0.5">
                      <Button
                        asChild
                        variant="ghost"
                        size="iconSm"
                        aria-label="Download"
                      >
                        <a
                          href={d.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <ProfessionalDocumentsDeleteButton
                        documentId={d.id}
                        enabled={uploadsEnabled}
                        className="text-[color:var(--color-ink-500)] hover:text-[color:var(--color-danger-700)] hover:bg-rose-50"
                      />
                    </div>
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

function StatInline({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-2.5 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
      <div className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-500)] sm:flex">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11.5px] text-[color:var(--color-ink-500)] truncate">
          {label}
        </p>
        <p className="mt-0.5 text-[18px] font-semibold tracking-tight leading-none tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

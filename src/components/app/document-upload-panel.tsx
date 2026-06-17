"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { postDocumentUpload } from "@/lib/client/post-document-upload";

export type UploadedDocListItem = {
  id: string;
  file_name: string;
  public_url: string;
  content_type: string;
  created_at: string;
};

type InFlightUpload = {
  tempId: string;
  fileName: string;
  status: "queued" | "uploading" | "success" | "error";
  error?: string;
};

function labelFromMime(ct: string): string {
  if (ct === "application/pdf") return "PDF";
  if (ct === "image/jpeg" || ct === "image/png") return "Image";
  return ct.split("/").pop() ?? "File";
}

export function DocumentUploadPanel(props: {
  title: string;
  description?: string;
  hint?: string;
  apiPath: "/api/uploads/professional" | "/api/uploads/facility-verification";
  initialDocuments: UploadedDocListItem[];
  enabled: boolean;
}) {
  const { title, description, hint, apiPath, initialDocuments, enabled } = props;
  const [docs, setDocs] = React.useState<UploadedDocListItem[]>(initialDocuments);
  const [pending, setPending] = React.useState<InFlightUpload[]>([]);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    const res = await fetch(apiPath, { credentials: "same-origin" });
    const json = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(json.documents)) {
      setDocs(json.documents as UploadedDocListItem[]);
    }
  }, [apiPath, enabled]);

  const uploadFile = React.useCallback(
    async (file: File) => {
      const tempId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now());

      setPending((p) => [
        ...p,
        { tempId, fileName: file.name, status: "queued" },
      ]);

      const run = async () => {
        setPending((p) =>
          p.map((x) =>
            x.tempId === tempId ? { ...x, status: "uploading" } : x,
          ),
        );
        try {
          const json = await postDocumentUpload(file, apiPath);
          setPending((p) =>
            p.map((x) =>
              x.tempId === tempId ? { ...x, status: "success" } : x,
            ),
          );
          toast.success(`${file.name} uploaded`);
          if (json.document) {
            setDocs((d) => [json.document as UploadedDocListItem, ...d]);
          } else {
            await refresh();
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : "Upload failed";
          setPending((p) =>
            p.map((x) =>
              x.tempId === tempId
                ? { ...x, status: "error", error: message }
                : x,
            ),
          );
          toast.error(message);
        } finally {
          setTimeout(() => {
            setPending((p) => p.filter((x) => x.tempId !== tempId));
          }, 2500);
        }
      };

      void run();
    },
    [apiPath, refresh],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !enabled) return;
    for (let i = 0; i < files.length; i++) {
      void uploadFile(files[i]!);
    }
    e.target.value = "";
  };

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-[14px] font-semibold">{title}</h3>
            {description ? (
              <p className="mt-1 max-w-xl text-[12.5px] text-[color:var(--color-ink-500)]">
                {description}
              </p>
            ) : null}
          </div>
          <div className="relative mt-2 inline-flex min-h-8 shrink-0 self-start sm:mt-0">
            <span className="pointer-events-none relative z-0 inline-flex">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                tabIndex={-1}
                aria-hidden="true"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Upload files
              </Button>
            </span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              multiple
              disabled={!enabled}
              aria-label="Choose PDF, JPG, or PNG files to upload"
              onChange={onInputChange}
              className="absolute inset-0 z-[1] cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {!enabled ? (
          <p className="mt-4 rounded-[var(--radius-sm)] border border-dashed border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] px-3 py-2 text-[12.5px] text-[color:var(--color-ink-600)]">
            Supabase uploads are unavailable. Copy{" "}
            <span className="font-mono text-[11px]">wanzwei/.env.example</span>{" "}
            to{" "}
            <span className="font-mono text-[11px]">wanzwei/.env.local</span>{" "}
            and add <span className="font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_URL</span>,{" "}
            <span className="font-mono text-[11px]">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </span>{" "}
            (or <span className="font-mono text-[11px]">SUPABASE_SERVICE_ROLE_KEY</span> for server-only). Restart{" "}
            <span className="font-mono text-[11px]">npm run dev</span>. Ensure Storage bucket{" "}
            <strong>documents</strong> exists and run{" "}
            <span className="font-mono text-[11px]">
              supabase/sql/documents.sql
            </span>
            .
          </p>
        ) : hint ? (
          <p className="mt-3 text-[11.5px] text-[color:var(--color-ink-400)]">
            {hint}
          </p>
        ) : null}

        {pending.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-[color:var(--color-border-default)] pt-4">
            {pending.map((p) => (
              <li
                key={p.tempId}
                className="flex items-center gap-3 text-[13px]"
              >
                <FileText className="h-4 w-4 shrink-0 text-[color:var(--color-ink-400)]" />
                <span className="min-w-0 flex-1 truncate">{p.fileName}</span>
                {p.status === "queued" || p.status === "uploading" ? (
                  <span className="inline-flex items-center gap-1.5 text-[color:var(--color-ink-500)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {p.status === "queued" ? "Queued" : "Uploading…"}
                  </span>
                ) : p.status === "success" ? (
                  <Badge tone="success" withDot>
                    <CheckCircle2 className="h-3 w-3" /> Uploaded
                  </Badge>
                ) : (
                  <span className="inline-flex max-w-[200px] items-center gap-1 text-rose-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate text-[12px]">{p.error}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        {docs.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-[color:var(--color-border-default)] pt-4">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 py-2.5 text-[13px] sm:flex-nowrap"
              >
                <FileText className="h-4 w-4 shrink-0 text-[color:var(--color-ink-400)]" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {d.file_name}
                </span>
                <Badge tone="slate" className="shrink-0">
                  {labelFromMime(d.content_type)}
                </Badge>
                <Badge tone="success" withDot className="shrink-0">
                  Uploaded
                </Badge>
                <span className="w-full text-[11.5px] text-[color:var(--color-ink-400)] sm:ml-auto sm:w-auto">
                  {format(new Date(d.created_at), "MMM d, yyyy · HH:mm")}
                </span>
                <a
                  href={d.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--color-brand-600)] hover:underline"
                >
                  Open <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        ) : enabled && pending.length === 0 ? (
          <p className="mt-4 border-t border-[color:var(--color-border-default)] pt-4 text-[12.5px] text-[color:var(--color-ink-500)]">
            No uploads yet. PDF, JPG, or PNG up to 15 MB.
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

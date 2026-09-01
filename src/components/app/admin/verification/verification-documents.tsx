"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminVerificationDocument } from "./verification-row-actions";

export function AdminVerificationDocuments({
  verificationId,
}: {
  verificationId: string;
}) {
  const [docs, setDocs] = React.useState<AdminVerificationDocument[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/verifications/${verificationId}/documents`,
          { credentials: "same-origin" },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof json.error === "string" ? json.error : "Failed to load documents");
          return;
        }
        if (!cancelled) {
          setDocs(Array.isArray(json.documents) ? json.documents : []);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load documents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [verificationId]);

  if (loading) {
    return <p className="text-[13px] text-[color:var(--color-ink-500)]">Loading documents…</p>;
  }
  if (docs.length === 0) {
    return <p className="text-[13px] text-[color:var(--color-ink-500)]">No documents found.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {docs.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{d.file_name}</p>
            <p className="text-[11.5px] text-[color:var(--color-ink-400)]">
              {new Date(d.uploaded_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge tone="slate">{d.content_type || "File"}</Badge>
            {d.public_url ? (
              <Button variant="ghost" size="iconSm" asChild aria-label="Open">
                <a href={d.public_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import * as React from "react";
import { Check, Eye, ExternalLink, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export type AdminVerificationDocument = {
  id: string;
  file_name: string;
  content_type: string;
  public_url: string;
  uploaded_at: string;
};

export function AdminVerificationRowActions({
  verificationId,
  status,
}: {
  verificationId: string;
  status: "Pending" | "Under Review" | "Verified" | "Rejected";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [docs, setDocs] = React.useState<AdminVerificationDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = React.useState(false);
  const [deciding, setDeciding] = React.useState<null | "Verified" | "Rejected">(null);

  const loadDocs = React.useCallback(async () => {
    await Promise.resolve();
    setLoadingDocs(true);
    try {
      const res = await fetch(
        `/api/admin/verifications/${verificationId}/documents`,
        { method: "GET", credentials: "same-origin" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Failed to load documents");
        return;
      }
      setDocs(Array.isArray(json.documents) ? (json.documents as AdminVerificationDocument[]) : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load documents";
      toast.error(message);
    } finally {
      setLoadingDocs(false);
    }
  }, [verificationId]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) return;
      if (docs.length > 0 || loadingDocs) return;
      void loadDocs();
    },
    [docs.length, loadDocs, loadingDocs],
  );

  const decide = React.useCallback(
    async (nextStatus: "Verified" | "Rejected") => {
      setDeciding(nextStatus);
      try {
        const res = await fetch(
          `/api/admin/verifications/${verificationId}/decision`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
            credentials: "same-origin",
          },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof json.error === "string" ? json.error : "Decision failed");
          return;
        }
        toast.success(`Verification ${nextStatus}`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Decision failed";
        toast.error(message);
      } finally {
        setDeciding(null);
      }
    },
    [router, verificationId],
  );

  const approveDisabled = deciding !== null || status === "Verified" || status === "Rejected";
  const rejectDisabled = deciding !== null || status === "Rejected" || status === "Verified";

  return (
    <div className="inline-flex items-center gap-1">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="iconSm" aria-label="View">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Submitted documents</DialogTitle>
          </DialogHeader>

          {loadingDocs ? (
            <p className="text-[13px] text-[color:var(--color-ink-500)]">
              Loading documents…
            </p>
          ) : docs.length === 0 ? (
            <p className="text-[13px] text-[color:var(--color-ink-500)]">
              No documents found.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[color:var(--color-ink-900)]">
                      {d.file_name}
                    </p>
                    <p className="text-[11.5px] text-[color:var(--color-ink-400)]">
                      {new Date(d.uploaded_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone="slate" className="shrink-0">
                      {d.content_type || "File"}
                    </Badge>
                    <Button variant="ghost" size="iconSm" asChild aria-label="Open">
                      <a
                        href={d.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="iconSm"
        aria-label="Approve"
        className="text-emerald-600 hover:bg-emerald-50"
        disabled={approveDisabled}
        onClick={() => void decide("Verified")}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="iconSm"
        aria-label="Reject"
        className="text-rose-600 hover:bg-rose-50"
        disabled={rejectDisabled}
        onClick={() => void decide("Rejected")}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}


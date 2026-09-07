"use client";

import * as React from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { postDocumentUpload } from "@/lib/client/post-document-upload";
import type { ProfessionalDocumentPurpose } from "@/lib/verification/document-purpose";

export type VerificationUploadedDocument = {
  id: string;
  file_name: string;
};

export function VerificationDocumentField({
  label,
  hint,
  purpose,
  enabled,
  document,
  onUploaded,
}: {
  label: string;
  hint: string;
  purpose: Extract<ProfessionalDocumentPurpose, "identity" | "credential">;
  enabled: boolean;
  document: VerificationUploadedDocument | null;
  onUploaded: (document: VerificationUploadedDocument) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputId = `${purpose}-document`;

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !enabled || uploading) return;
    setUploading(true);
    try {
      const json = await postDocumentUpload(file, "/api/uploads/professional", {
        purpose,
      });
      const uploaded = json.document;
      if (!uploaded?.id) {
        throw new Error("Upload did not return a document id.");
      }
      onUploaded({ id: uploaded.id, file_name: uploaded.file_name });
      toast.success(`${file.name} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-1.5 sm:col-span-2">
      <p className="text-[13px] font-medium">{label}</p>
      <p className="text-[12.5px] text-[color:var(--color-ink-500)]">{hint}</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative inline-flex min-h-9">
          <span className="pointer-events-none relative z-0 inline-flex">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              tabIndex={-1}
              aria-hidden="true"
              disabled={!enabled || uploading}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden />
              )}
              {document ? "Replace file" : "Upload file"}
            </Button>
          </span>
          <input
            id={inputId}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            disabled={!enabled || uploading}
            aria-label={label}
            onChange={onChange}
            className="absolute inset-0 z-[1] cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </div>
        {document ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px] text-[color:var(--color-ink-700)]">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{document.file_name}</span>
          </span>
        ) : (
          <span className="text-[12.5px] text-[color:var(--color-ink-400)]">
            PDF, JPG, or PNG · max 15 MB · private
          </span>
        )}
      </div>
    </div>
  );
}

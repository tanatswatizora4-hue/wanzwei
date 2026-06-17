"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postDocumentUpload } from "@/lib/client/post-document-upload";

export function ProfessionalProfileCertUploadButton({
  enabled,
}: {
  enabled: boolean;
}) {
  const onInputChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length || !enabled) return;
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        try {
          await postDocumentUpload(file, "/api/uploads/professional");
          toast.success(`${file.name} uploaded`);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          toast.error(message);
        }
      }
      e.target.value = "";
    },
    [enabled],
  );

  return (
    <div className="relative inline-flex min-h-8 shrink-0 self-start">
      <span className="pointer-events-none relative z-0 inline-flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          tabIndex={-1}
          aria-hidden="true"
        >
          + Upload
        </Button>
      </span>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        multiple
        disabled={!enabled}
        aria-label="Upload certification document (PDF, JPG, or PNG)"
        onChange={onInputChange}
        className="absolute inset-0 z-[1] cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  );
}

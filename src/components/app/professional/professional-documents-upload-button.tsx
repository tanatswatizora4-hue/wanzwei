"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { postDocumentUpload } from "@/lib/client/post-document-upload";

export function ProfessionalDocumentsUploadButton({
  enabled,
}: {
  enabled: boolean;
}) {
  const router = useRouter();

  const onChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (!files.length || !enabled) return;

      // Reset immediately so selecting the same file again works.
      e.target.value = "";

      try {
        for (const file of files) {
          await postDocumentUpload(file, "/api/uploads/professional");
          toast.success(`${file.name} uploaded`);
        }
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error(message);
      }
    },
    [enabled, router],
  );

  return (
    <div className="relative mt-2 inline-flex min-h-8 shrink-0 self-start sm:mt-0">
      <span className="pointer-events-none relative z-0 inline-flex">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          tabIndex={-1}
          aria-hidden="true"
          disabled={!enabled}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          Upload
        </Button>
      </span>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        multiple
        disabled={!enabled}
        aria-label="Choose PDF, JPG, or PNG files to upload"
        onChange={onChange}
        className="absolute inset-0 z-[1] cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  );
}


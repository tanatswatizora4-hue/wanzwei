"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";

export function ProfileAvatarUploader(props: {
  name: string;
  avatarUrl?: string | null;
  enabled: boolean;
  size?: number;
  /** When false, hides the JPG/PNG hint (e.g. inline profile header row). */
  showCaption?: boolean;
}) {
  const { name, avatarUrl, enabled, size = 64, showCaption = true } = props;
  const router = useRouter();
  const [uploading, setUploading] = React.useState(false);
  const [previewBlob, setPreviewBlob] = React.useState<string | null>(null);

  const displaySrc =
    previewBlob ??
    (avatarUrl && /^https?:\/\//i.test(String(avatarUrl).trim())
      ? String(avatarUrl).trim()
      : null);

  React.useEffect(() => {
    if (!previewBlob) return;
    return () => URL.revokeObjectURL(previewBlob);
  }, [previewBlob]);

  const onChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !enabled) return;

      const objectUrl = URL.createObjectURL(file);
      setPreviewBlob(objectUrl);
      setUploading(true);

      const fd = new FormData();
      fd.append("file", file);

      try {
        const res = await fetch("/api/profile/avatar", {
          method: "POST",
          body: fd,
          credentials: "same-origin",
        });
        const json = (await res.json().catch(() => ({}))) as {
          avatarUrl?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(
            typeof json.error === "string" ? json.error : "Upload failed",
          );
        }
        toast.success("Profile photo updated");
        setPreviewBlob(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
        setPreviewBlob(null);
      } finally {
        setUploading(false);
      }
    },
    [enabled, router],
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative inline-flex"
        style={{ width: size, height: size }}
      >
        <span className="pointer-events-none relative z-0">
          <Avatar name={name} size={size} src={displaySrc} />
        </span>
        {uploading ? (
          <span className="absolute inset-0 z-[2] flex items-center justify-center rounded-full bg-[color:var(--color-ink-900)]/45">
            <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden />
          </span>
        ) : null}
        <input
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          aria-label="Upload profile photo"
          disabled={!enabled || uploading}
          onChange={onChange}
          className="absolute inset-0 z-[1] cursor-pointer rounded-full opacity-0 disabled:cursor-not-allowed"
        />
      </div>
      {showCaption ? (
        <p className="max-w-[200px] text-center text-[11px] leading-snug text-[color:var(--color-ink-400)]">
          {enabled
            ? "JPG or PNG · max 5 MB · tap photo to upload"
            : "Add Supabase credentials to enable photo upload."}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ListingImageView } from "@/lib/marketplace/listing-image-types";

export function ListingImageManager({
  listingId,
  images,
}: {
  listingId: string;
  images: ListingImageView[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPending(true);
    const formData = new FormData();
    formData.append("listingId", listingId);
    formData.append("file", file);
    try {
      const response = await fetch("/api/uploads/listing-images", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Upload failed");
      }
      toast.success("Image added");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setPending(false);
    }
  };

  const remove = async (imageId: string) => {
    setPending(true);
    try {
      const params = new URLSearchParams({ listingId, imageId });
      const response = await fetch(`/api/uploads/listing-images?${params}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Could not remove image");
      }
      toast.success("Image removed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove image");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {images.map((image) => (
          <div key={image.id} className="relative h-24 w-24 overflow-hidden rounded-[8px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.fileName}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white"
              onClick={() => remove(image.id)}
              disabled={pending}
              aria-label={`Remove ${image.fileName}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div>
        <label className="inline-flex items-center gap-2 text-[13px] font-medium text-[color:var(--color-brand-600)]">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Add image
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            disabled={pending}
            onChange={upload}
          />
        </label>
        <p className="mt-1 text-[12px] text-[color:var(--color-ink-400)]">
          JPG or PNG, up to 5 MB. Listing images are stored separately from private
          verification documents.
        </p>
      </div>
    </div>
  );
}

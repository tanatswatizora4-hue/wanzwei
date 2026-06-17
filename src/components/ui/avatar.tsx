import * as React from "react";
import { cn } from "@/lib/cn";
import { initials as toInitials } from "@/lib/format";

function isHttpImageUrl(src: string): boolean {
  return /^https?:\/\//i.test(src.trim());
}

export function Avatar({
  name,
  size = 36,
  className,
  gradient,
  src,
}: {
  name: string;
  size?: number;
  className?: string;
  gradient?: string;
  /** Public URL (e.g. Supabase Storage); non-URLs fall back to initials. */
  src?: string | null;
}) {
  const imageSrc =
    src && typeof src === "string" && isHttpImageUrl(src) ? src.trim() : null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-white ring-1 ring-black/5 select-none",
        !imageSrc && (gradient ?? "bg-gradient-to-br from-indigo-500 to-violet-600"),
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={name}
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- public Supabase URL; host varies per project
        <img src={imageSrc} alt="" className="h-full w-full object-cover" />
      ) : (
        toInitials(name)
      )}
    </span>
  );
}
export function FacilityLogo({
  initials,
  gradient,
  size = 36,
  className,
}: {
  initials: string;
  gradient: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[10px] bg-gradient-to-br text-white font-semibold ring-1 ring-black/5",
        gradient,
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

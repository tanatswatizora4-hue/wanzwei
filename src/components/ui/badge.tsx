import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral:
          "bg-[color:var(--color-ink-900)]/[0.04] text-[color:var(--color-ink-700)]",
        brand:
          "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
        success: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]",
        warn: "bg-[color:var(--color-warn-50)] text-[color:var(--color-warn-700)]",
        danger:
          "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]",
        info: "bg-[color:var(--color-info-50)] text-[color:var(--color-info-700)]",
        violet: "bg-violet-50 text-violet-700",
        sky: "bg-sky-50 text-sky-700",
        amber: "bg-amber-50 text-amber-700",
        emerald: "bg-emerald-50 text-emerald-700",
        slate: "bg-slate-100 text-slate-700",
        rose: "bg-rose-50 text-rose-700",
      },
      withDot: {
        true: "pl-1.5",
        false: "",
      },
    },
    defaultVariants: { tone: "neutral", withDot: false },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {
  dotClassName?: string;
}

export function Badge({
  className,
  tone,
  withDot,
  dotClassName,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badge({ tone, withDot }), className)} {...props}>
      {withDot ? (
        <span
          className={cn(
            "size-1.5 rounded-full bg-current opacity-80",
            dotClassName,
          )}
        />
      ) : null}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, BadgeProps["tone"]> = {
  Open: "emerald",
  Interested: "sky",
  Shortlisted: "amber",
  Matched: "violet",
  Closed: "slate",
  "Under Review": "info",
  Screening: "amber",
  Interview: "violet",
  Offer: "emerald",
  Hired: "emerald",
  Rejected: "danger",
  Pending: "amber",
  Verified: "success",
  New: "emerald",
  Matching: "violet",
  Posted: "info",
  // Emergency alert statuses
  Sent: "info",
  Filled: "success",
  Expired: "slate",
  Cancelled: "slate",
  Accepted: "success",
  Declined: "rose",
  Critical: "danger",
  High: "warn",
  Standard: "info",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = STATUS_TONES[status] ?? "neutral";
  return (
    <Badge tone={tone} withDot className={className}>
      {status}
    </Badge>
  );
}

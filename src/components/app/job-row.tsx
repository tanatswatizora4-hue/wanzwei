"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { SaveJobButton } from "@/components/app/save-job-button";
import { Badge } from "@/components/ui/badge";
import { FacilityLogo } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import type { Facility, Job } from "@/lib/types";

const TYPE_TONE: Record<string, "emerald" | "sky" | "violet" | "amber"> = {
  "Full-time": "emerald",
  "Part-time": "sky",
  Contract: "sky",
  Locum: "amber",
  Permanent: "violet",
};

export function JobRow({
  job,
  facility,
  href,
  showBookmark = true,
  compact = false,
}: {
  job: Job;
  facility: Facility;
  href?: string;
  showBookmark?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-colors hover:bg-[color:var(--color-ink-900)]/[0.025]",
        compact && "py-2.5",
      )}
    >
      <FacilityLogo
        initials={facility.initials}
        gradient={facility.logoColor}
        size={compact ? 32 : 36}
      />
      <div className="min-w-0 flex-1">
        <Link
          href={href ?? "#"}
          className="text-[13.5px] font-semibold text-[color:var(--color-ink-900)] hover:text-[color:var(--color-brand-700)]"
        >
          {job.title}
        </Link>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[color:var(--color-ink-500)]">
          <span className="truncate">{facility.name}</span>
          <span className="text-[color:var(--color-ink-300)]">·</span>
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{job.location}</span>
        </div>
      </div>
      <Badge tone={TYPE_TONE[job.type] ?? "slate"} className="hidden sm:inline-flex">
        {job.type}
      </Badge>
      <span className="hidden md:inline text-[11.5px] text-[color:var(--color-ink-400)] tabular-nums w-12 text-right">
        {timeAgo(job.postedAt)} ago
      </span>
      {showBookmark ? (
        <SaveJobButton
          jobId={job.id}
          jobTitle={job.title}
          defaultSaved={Boolean(job.saved)}
          className="hidden sm:inline-flex h-7 w-7 items-center justify-center"
        />
      ) : null}
    </div>
  );
}

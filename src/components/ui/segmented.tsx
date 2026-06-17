import * as React from "react";
import { cn } from "@/lib/cn";

export type SegmentedTone =
  | "default"
  | "violet"
  | "amber"
  | "rose"
  | "emerald"
  | "sky";

type Option = {
  value: string;
  label: React.ReactNode;
  /** Per-option tone for the selected state (overrides component-level tone). */
  tone?: SegmentedTone;
  /** Optional leading icon shown inside the pill. */
  icon?: React.ReactNode;
};

/**
 * SegmentedRadio — server-friendly pill group, CSS-only.
 *
 * Renders a `<label>` per option containing a sibling `<input type="radio">`
 * so the `peer-checked` Tailwind variant can style the visible pill without JS.
 *
 * Each option occupies the same horizontal cell (flex-1), giving a true
 * "segmented control" feel.
 */
export function SegmentedRadio({
  name,
  options,
  defaultValue,
  tone = "default",
  size = "md",
  className,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  tone?: SegmentedTone;
  size?: "sm" | "md";
  className?: string;
}) {
  const heights = size === "sm" ? "h-8" : "h-9";
  const text = size === "sm" ? "text-[12px]" : "text-[12.5px]";

  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex w-full min-w-0 max-w-full items-stretch overflow-hidden rounded-full border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] p-0.5",
        heights,
        className,
      )}
    >
      {options.map((opt) => {
        const optTone = opt.tone ?? tone;
        const checkedClasses = SELECTED_BY_TONE[optTone];
        const id = `${name}-${opt.value}`;
        return (
          <label
            key={opt.value}
            htmlFor={id}
            className={cn(
              "group relative flex flex-1 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-full font-medium transition select-none",
              text,
              "text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]",
            )}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={opt.value}
              defaultChecked={defaultValue === opt.value}
              className="peer sr-only"
            />
            <span
              className={cn(
                "absolute inset-0 rounded-full transition opacity-0 ring-1 ring-transparent",
                "peer-checked:opacity-100",
                checkedClasses,
              )}
              aria-hidden
            />
            <span
              className={cn(
                "relative z-[1] inline-flex min-w-0 max-w-full items-center justify-center gap-1 px-1.5 sm:px-2.5 truncate transition",
                "peer-checked:font-semibold peer-checked:text-[color:var(--color-ink-900)]",
                optTone !== "default" && "peer-checked:!text-white",
              )}
            >
              {opt.icon ? (
                <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">
                  {opt.icon}
                </span>
              ) : null}
              <span className="truncate">{opt.label}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

const SELECTED_BY_TONE: Record<SegmentedTone, string> = {
  default:
    "bg-white shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_1px_2px_rgba(15,23,42,0.08)] ring-[color:var(--color-border-default)]",
  violet:
    "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_2px_8px_-2px_rgba(99,102,241,0.45)] ring-violet-400/30",
  amber:
    "bg-gradient-to-br from-amber-500 to-orange-500 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.45)] ring-amber-400/30",
  rose: "bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.45)] ring-rose-400/30",
  emerald:
    "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.45)] ring-emerald-400/30",
  sky: "bg-gradient-to-br from-sky-500 to-indigo-500 shadow-[0_2px_8px_-2px_rgba(14,165,233,0.45)] ring-sky-400/30",
};

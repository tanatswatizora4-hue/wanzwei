"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Stepper — number input with -/+ controls, optional prefix/suffix.
 *
 * Designed for forms: submits its current numeric value via a hidden
 * `<input type="number" name={name}>` so server actions just `formData.get(name)`.
 */
export function Stepper({
  name,
  defaultValue = 0,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  className,
  inputClassName,
  ariaLabel,
}: {
  name: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
}) {
  const [value, setValue] = React.useState<number>(defaultValue);

  const clamp = React.useCallback(
    (v: number) => {
      let next = isNaN(v) ? 0 : v;
      if (next < min) next = min;
      if (typeof max === "number" && next > max) next = max;
      return next;
    },
    [min, max],
  );

  const inc = () => setValue((v) => clamp(v + step));
  const dec = () => setValue((v) => clamp(v - step));

  return (
    <div
      className={cn(
        "group flex h-9 items-stretch rounded-[10px] border border-[color:var(--color-border-default)] bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)] transition focus-within:border-[color:var(--color-brand-400)] focus-within:ring-2 focus-within:ring-[color:var(--color-brand-100)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={dec}
        aria-label="Decrease"
        className="flex w-9 shrink-0 items-center justify-center rounded-l-[10px] text-[color:var(--color-ink-500)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-ink-900)] disabled:opacity-40 transition"
        disabled={value <= min}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>

      <div className="relative flex flex-1 items-center justify-center gap-1 border-x border-[color:var(--color-border-default)] px-2">
        {prefix ? (
          <span className="text-[11px] font-medium text-[color:var(--color-ink-400)]">
            {prefix}
          </span>
        ) : null}
        <input
          type="number"
          name={name}
          value={value}
          aria-label={ariaLabel}
          onChange={(e) => setValue(clamp(Number(e.target.value)))}
          min={min}
          max={max}
          step={step}
          className={cn(
            "no-spinner w-full bg-transparent text-center font-display num text-[14.5px] font-semibold tabular-nums text-[color:var(--color-ink-900)] outline-none",
            inputClassName,
          )}
        />
        {suffix ? (
          <span className="text-[11px] font-medium text-[color:var(--color-ink-400)]">
            {suffix}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={inc}
        aria-label="Increase"
        className="flex w-9 shrink-0 items-center justify-center rounded-r-[10px] text-[color:var(--color-ink-500)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-ink-900)] disabled:opacity-40 transition"
        disabled={typeof max === "number" && value >= max}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

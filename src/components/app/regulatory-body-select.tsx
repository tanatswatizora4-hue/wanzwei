"use client";

import { cn } from "@/lib/cn";
import { REGULATORY_BODIES } from "@/lib/regulatory-bodies";

const nativeSelectClassName = cn(
  "flex min-h-11 w-full rounded-[var(--radius-sm)] border bg-white px-3 text-sm sm:h-9 sm:min-h-9",
  "border-[color:var(--color-border-default)] text-[color:var(--color-ink-900)]",
  "shadow-[var(--shadow-xs)] transition-colors",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--color-brand-100)] focus-visible:border-[color:var(--color-brand-500)]",
);

export function RegulatoryBodySelect({
  name = "registeringBody",
  id = "registeringBody",
  value,
  required = false,
  disabled = false,
  onValueChange,
}: {
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <select
      id={id}
      name={name}
      required={required}
      disabled={disabled}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
      className={nativeSelectClassName}
    >
      <option value="" disabled>
        Select regulatory body
      </option>
      {REGULATORY_BODIES.map((body) => (
        <option key={body.code} value={body.code}>
          {body.label}
        </option>
      ))}
    </select>
  );
}

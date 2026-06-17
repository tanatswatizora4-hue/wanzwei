import * as React from "react";
import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-9 w-full rounded-[var(--radius-sm)] border bg-white px-3 text-sm",
        "border-[color:var(--color-border-default)] text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-ink-300)]",
        "shadow-[var(--shadow-xs)] transition-colors",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--color-brand-100)] focus-visible:border-[color:var(--color-brand-500)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[88px] w-full rounded-[var(--radius-sm)] border bg-white px-3 py-2 text-sm",
      "border-[color:var(--color-border-default)] text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-ink-300)]",
      "shadow-[var(--shadow-xs)] transition-colors",
      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--color-brand-100)] focus-visible:border-[color:var(--color-brand-500)]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-[13px] font-medium text-[color:var(--color-ink-700)]",
        className,
      )}
      {...props}
    />
  );
}

export function FieldHint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs text-[color:var(--color-ink-400)] mt-1",
        className,
      )}
    >
      {children}
    </p>
  );
}

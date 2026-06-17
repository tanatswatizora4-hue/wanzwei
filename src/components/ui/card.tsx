import * as React from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "glass" | "glass-strong";

export function Card({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  if (variant === "glass") {
    return (
      <div
        className={cn(
          "glass glass-highlight rounded-[var(--radius-md)] overflow-hidden",
          className,
        )}
        {...props}
      />
    );
  }
  if (variant === "glass-strong") {
    return (
      <div
        className={cn(
          "glass-strong glass-highlight rounded-[var(--radius-md)] overflow-hidden",
          className,
        )}
        {...props}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border bg-white/95 shadow-[var(--shadow-sm)] backdrop-blur-sm",
        "border-[color:var(--color-border-default)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-5 pt-5 pb-3",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-display text-[15px] font-semibold tracking-tight text-[color:var(--color-ink-900)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[13px] text-[color:var(--color-ink-500)]", className)}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-t px-5 py-3 border-[color:var(--color-border-default)]",
        className,
      )}
      {...props}
    />
  );
}

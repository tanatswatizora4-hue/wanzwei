import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--color-brand-100)] focus-visible:border-[color:var(--color-brand-500)] disabled:opacity-50 disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[color:var(--color-brand-600)] text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_1px_2px_rgba(15,23,42,0.18)] hover:bg-[color:var(--color-brand-700)] active:translate-y-px",
        secondary:
          "bg-white text-[color:var(--color-ink-900)] border border-[color:var(--color-border-default)] shadow-[var(--shadow-xs)] hover:bg-[color:var(--color-surface-muted)]",
        ghost:
          "text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-ink-900)]/[0.04]",
        outline:
          "bg-transparent text-[color:var(--color-ink-900)] border border-[color:var(--color-border-default)] hover:bg-[color:var(--color-ink-900)]/[0.03]",
        danger:
          "bg-[color:var(--color-danger-500)] text-white hover:bg-[color:var(--color-danger-700)]",
        link: "text-[color:var(--color-brand-600)] hover:underline underline-offset-4 px-0 h-auto",
        soft: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)] hover:bg-[color:var(--color-brand-100)]",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-3.5",
        lg: "h-10 px-4 text-[15px]",
        icon: "h-9 w-9",
        iconSm: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(button({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

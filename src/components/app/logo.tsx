import * as React from "react";
import { cn } from "@/lib/cn";

export function LogoMark({
  size = 24,
  className,
  tone = "light",
}: {
  size?: number;
  className?: string;
  tone?: "light" | "dark";
}) {
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn(className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a99dff" />
          <stop offset="45%" stopColor="#7a64f5" />
          <stop offset="100%" stopColor="#3d27a8" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.45" />
          <stop offset="60%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor="#ff86d7" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff86d7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer rounded square base */}
      <rect width="32" height="32" rx="9" fill={`url(#${id}-bg)`} />
      {/* Bottom-right radial glow for depth */}
      <rect width="32" height="32" rx="9" fill={`url(#${id}-glow)`} />
      {/* Top shine */}
      <rect width="32" height="32" rx="9" fill={`url(#${id}-shine)`} />

      {/* W monogram + heartbeat tail */}
      <path
        d="M7.5 10.5 L10.8 21 L14.5 13.5 L17.8 21 L21 10.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Pulse dot */}
      <circle cx="24" cy="11.2" r="1.8" fill="white" />

      {/* Subtle inner border for crispness */}
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="8.5"
        fill="none"
        stroke={
          tone === "dark"
            ? "rgba(255,255,255,0.25)"
            : "rgba(255,255,255,0.5)"
        }
        strokeWidth="1"
      />
    </svg>
  );
}

export function Logo({
  className,
  showTagline = true,
  tone = "light",
  size = 28,
}: {
  className?: string;
  showTagline?: boolean;
  tone?: "light" | "dark";
  size?: number;
}) {
  const titleColor =
    tone === "dark" ? "text-white" : "text-[color:var(--color-ink-900)]";
  const taglineColor =
    tone === "dark" ? "text-white/55" : "text-[color:var(--color-ink-400)]";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} tone={tone} />
      <div className="leading-tight">
        <p
          className={cn(
            "text-[15.5px] font-semibold tracking-tight",
            titleColor,
          )}
        >
          Wanzwei
        </p>
        {showTagline ? (
          <p
            className={cn(
              "text-[9.5px] font-medium uppercase tracking-[0.16em]",
              taglineColor,
            )}
          >
            Healthcare Staffing
          </p>
        ) : null}
      </div>
    </div>
  );
}

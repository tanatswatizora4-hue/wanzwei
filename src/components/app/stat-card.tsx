import * as React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

const ACCENTS = {
  violet: { stroke: "#6f5ef0", soft: "#ece9ff" },
  emerald: { stroke: "#059669", soft: "#dcfce8" },
  amber: { stroke: "#d97706", soft: "#fef3c7" },
  sky: { stroke: "#0284c7", soft: "#e0f2fe" },
  rose: { stroke: "#e11d48", soft: "#ffe4e6" },
  indigo: { stroke: "#4f46e5", soft: "#e0e7ff" },
};

export type StatAccent = keyof typeof ACCENTS;

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  trend,
  accent = "violet",
  className,
}: {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  trend?: number[];
  accent?: StatAccent;
  className?: string;
}) {
  const positive = delta === undefined ? null : delta > 0;
  const flat = delta === 0;
  const { stroke, soft } = ACCENTS[accent];

  return (
    <div
      className={cn(
        "card card-hover group relative overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Top accent hairline */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${stroke} 50%, transparent 100%)`,
          opacity: 0.5,
        }}
      />

      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-500)] truncate">
            {label}
          </p>
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: stroke, boxShadow: `0 0 0 3px ${soft}` }}
          />
        </div>

        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="font-display num text-[30px] font-bold tracking-tight text-[color:var(--color-ink-900)] leading-none">
            {value}
          </p>
          {delta !== undefined ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[11.5px] font-semibold leading-none tabular-nums pb-0.5",
                flat
                  ? "text-[color:var(--color-ink-400)]"
                  : positive
                    ? "text-emerald-600"
                    : "text-rose-600",
              )}
            >
              {flat ? (
                <Minus className="h-3 w-3" strokeWidth={2.5} />
              ) : positive ? (
                <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
              ) : (
                <ArrowDownRight className="h-3 w-3" strokeWidth={2.5} />
              )}
              {positive ? "+" : ""}
              {delta}%
            </span>
          ) : null}
        </div>

        <p className="mt-1.5 text-[10.5px] text-[color:var(--color-ink-400)]">
          {deltaLabel ?? "vs. last 30 days"}
        </p>
      </div>

      {trend && trend.length >= 2 ? (
        <div className="h-10 -mt-1">
          <MiniSparkline data={trend} stroke={stroke} />
        </div>
      ) : (
        <div className="h-2" />
      )}
    </div>
  );
}

function MiniSparkline({
  data,
  stroke,
}: {
  data: number[];
  stroke: string;
}) {
  const id = React.useId();
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 100;
  const H = 40;
  const padY = 4;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: H - ((v - min) / range) * (H - padY * 2) - padY,
  }));

  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = ((prev.x + curr.x) / 2).toFixed(2);
    d += ` C ${cpx},${prev.y.toFixed(2)} ${cpx},${curr.y.toFixed(2)} ${curr.x.toFixed(2)},${curr.y.toFixed(2)}`;
  }
  const area = `${d} L ${W},${H} L 0,${H} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full h-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* End-point pulse */}
      <circle
        cx={last.x}
        cy={last.y}
        r="1.8"
        fill={stroke}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

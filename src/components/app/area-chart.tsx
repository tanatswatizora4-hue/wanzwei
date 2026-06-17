"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AppAreaChart({
  data,
  series,
  height = 240,
}: {
  data: Array<Record<string, number | string>>;
  series: { key: string; label: string; color: string }[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -8 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="rgba(15,23,42,0.06)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#9097b3"
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <YAxis stroke="#9097b3" tickLine={false} axisLine={false} fontSize={11} width={36} />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 12px 32px -8px rgba(15,23,42,0.16)",
              fontSize: 12,
              padding: "6px 10px",
            }}
            cursor={{ stroke: "rgba(15,23,42,0.08)", strokeWidth: 1 }}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

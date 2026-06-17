"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

export function Sparkline({
  data,
  positive = true,
  height = 40,
}: {
  data: number[];
  positive?: boolean;
  height?: number;
}) {
  const chartData = data.map((value, i) => ({ i, value }));
  const color = positive ? "#10b981" : "#ef4444";
  const id = `spark-${positive ? "pos" : "neg"}-${data.length}`;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${id})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

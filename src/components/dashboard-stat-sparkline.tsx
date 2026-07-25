"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

type DashboardStatSparklineProps = {
  data: number[];
  color: string;
};

export function DashboardStatSparkline({
  data,
  color,
}: DashboardStatSparklineProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  const hasSignal = data.some((v) => v > 0);

  if (!hasSignal) {
    return (
      <div className="h-9 w-24 shrink-0 rounded-md bg-muted/40" aria-hidden />
    );
  }

  return (
    <div className="h-9 w-24 shrink-0" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            fill={color}
            fillOpacity={0.15}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { PackageDistributionPoint } from "@/lib/dashboard-metrics";

const SLICE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground) / 0.55)",
  "hsl(var(--status-expiring))",
  "hsl(var(--status-expired) / 0.75)",
  "hsl(217 91% 60% / 0.7)",
  "hsl(280 65% 60% / 0.7)",
];

function DistributionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PackageDistributionPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-soft">
      <p className="text-sm font-medium">{row.name}</p>
      <p className="font-mono text-xs text-muted-foreground">
        {row.count} member{row.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function PackageDistributionChart({
  data,
}: {
  data: PackageDistributionPoint[];
}) {
  if (data.length === 0) {
    return (
      <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No active memberships to chart.
      </p>
    );
  }

  const top = data[0];

  return (
    <div className="relative h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={72}
            outerRadius={108}
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<DistributionTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="max-w-[100px] truncate text-xs font-medium">{top.name}</p>
        <p className="font-mono text-lg font-bold">{top.count}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Most popular
        </p>
      </div>
    </div>
  );
}

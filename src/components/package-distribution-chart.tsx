"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { ResponsiveChartShell } from "@/components/charts/responsive-chart-shell";
import { useChartLayout } from "@/hooks/use-chart-layout";
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
  const { compact, shortViewport } = useChartLayout();

  if (data.length === 0) {
    return (
      <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground sm:h-[280px]">
        No active memberships to chart.
      </p>
    );
  }

  const top = data[0];
  const useCompactPie = compact || shortViewport;

  return (
    <div className="relative w-full min-w-0 max-w-full overflow-hidden">
      <ResponsiveChartShell>
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={useCompactPie ? "42%" : "58%"}
            outerRadius={useCompactPie ? "72%" : "86%"}
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
      </ResponsiveChartShell>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p
          className={
            useCompactPie
              ? "max-w-[72px] truncate text-[10px] font-medium"
              : "max-w-[100px] truncate text-xs font-medium"
          }
        >
          {top.name}
        </p>
        <p
          className={
            useCompactPie
              ? "font-mono text-base font-bold"
              : "font-mono text-lg font-bold"
          }
        >
          {top.count}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Most popular
        </p>
      </div>
    </div>
  );
}

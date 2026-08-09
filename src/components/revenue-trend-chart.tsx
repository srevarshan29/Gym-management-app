"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ResponsiveChartShell } from "@/components/charts/responsive-chart-shell";
import {
  chartMargins,
  useChartLayout,
  xAxisInterval,
  yAxisWidth,
} from "@/hooks/use-chart-layout";
import type { MonthlyRevenuePoint } from "@/lib/revenue";
import { formatCurrency } from "@/lib/utils";

/** Volt green — positive revenue trend accent. */
const LINE_COLOR = "hsl(var(--primary))";
const GRID_COLOR = "hsl(var(--border))";
const AXIS_COLOR = "hsl(var(--muted-foreground))";

type ChartRow = MonthlyRevenuePoint & { revenue: number };

function formatAxisCurrency(value: number): string {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}k`;
  return `₹${value}`;
}

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-soft">
      <p className="text-xs text-muted-foreground">{row.monthTooltip}</p>
      <p className="font-mono text-sm font-semibold">
        {formatCurrency(row.revenue)}
      </p>
    </div>
  );
}

export function RevenueTrendChart({ data }: { data: MonthlyRevenuePoint[] }) {
  const { compact } = useChartLayout();
  const tickSize = compact ? 10 : 12;

  return (
    <ResponsiveChartShell>
      <LineChart data={data} margin={chartMargins(compact)}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={GRID_COLOR}
          vertical={false}
        />
        <XAxis
          dataKey="monthLabel"
          tick={{ fill: AXIS_COLOR, fontSize: tickSize }}
          tickLine={false}
          axisLine={{ stroke: GRID_COLOR }}
          interval={xAxisInterval(data.length, compact)}
          minTickGap={compact ? 24 : 8}
          angle={0}
          textAnchor="middle"
          height={compact ? 28 : 32}
        />
        <YAxis
          width={yAxisWidth(compact)}
          tick={{ fill: AXIS_COLOR, fontSize: tickSize }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxisCurrency}
          domain={[0, "auto"]}
          allowDecimals={false}
        />
        <Tooltip
          content={<RevenueTooltip />}
          cursor={{
            stroke: LINE_COLOR,
            strokeWidth: 1,
            strokeDasharray: "4 4",
          }}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={LINE_COLOR}
          strokeWidth={2.5}
          dot={{
            r: compact ? 3 : 4,
            fill: LINE_COLOR,
            stroke: "hsl(var(--card))",
            strokeWidth: 2,
          }}
          activeDot={{
            r: compact ? 5 : 6,
            fill: LINE_COLOR,
            stroke: "hsl(var(--card))",
            strokeWidth: 2,
          }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveChartShell>
  );
}

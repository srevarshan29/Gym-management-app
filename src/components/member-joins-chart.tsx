"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
import type { MonthlyMemberJoinPoint } from "@/lib/analytics-metrics";

const BAR_COLOR = "hsl(var(--primary))";
const GRID_COLOR = "hsl(var(--border))";
const AXIS_COLOR = "hsl(var(--muted-foreground))";

type ChartRow = MonthlyMemberJoinPoint & { joins: number };

function JoinsTooltip({
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
        {row.joins} new member{row.joins === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function MemberJoinsChart({ data }: { data: MonthlyMemberJoinPoint[] }) {
  const { compact } = useChartLayout();
  const tickSize = compact ? 10 : 12;

  return (
    <ResponsiveChartShell>
      <BarChart data={data} margin={chartMargins(compact)}>
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
          allowDecimals={false}
          domain={[0, "auto"]}
        />
        <Tooltip
          content={<JoinsTooltip />}
          cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
        />
        <Bar
          dataKey="joins"
          fill={BAR_COLOR}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveChartShell>
  );
}

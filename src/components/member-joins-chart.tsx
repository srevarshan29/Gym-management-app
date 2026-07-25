"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={GRID_COLOR}
            vertical={false}
          />
          <XAxis
            dataKey="monthLabel"
            tick={{ fill: AXIS_COLOR, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
          />
          <YAxis
            tick={{ fill: AXIS_COLOR, fontSize: 12 }}
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
      </ResponsiveContainer>
    </div>
  );
}

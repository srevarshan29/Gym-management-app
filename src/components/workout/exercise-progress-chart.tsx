"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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
import type { ExerciseProgressPoint } from "@/lib/workout-tracking/progress";
import type { ExerciseTrackingType } from "@prisma/client";

const LINE_COLOR = "hsl(var(--primary))";
const GRID_COLOR = "hsl(var(--border))";
const AXIS_COLOR = "hsl(var(--muted-foreground))";

type ChartRow = ExerciseProgressPoint & {
  chartValue: number;
};

function ProgressTooltip({
  active,
  payload,
  trackingType,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
  trackingType: ExerciseTrackingType;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const valueLabel =
    trackingType === "TIME"
      ? `${row.maxDurationSeconds ?? 0}s`
      : `${row.maxWeightKg ?? 0} kg`;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-soft">
      <p className="text-xs text-muted-foreground">{row.label}</p>
      <p className="font-mono text-sm font-semibold">{valueLabel}</p>
    </div>
  );
}

export function ExerciseProgressChart({
  data,
  targetWeightKg,
  trackingType,
}: {
  data: ExerciseProgressPoint[];
  targetWeightKg: number | null;
  trackingType: ExerciseTrackingType;
}) {
  const { compact } = useChartLayout();
  const tickSize = compact ? 10 : 12;
  const chartData: ChartRow[] = data.map((point) => ({
    ...point,
    chartValue:
      trackingType === "TIME"
        ? point.maxDurationSeconds ?? 0
        : point.maxWeightKg ?? 0,
  }));

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Log completed workouts to see progress here.
      </p>
    );
  }

  return (
    <ResponsiveChartShell>
      <LineChart data={chartData} margin={chartMargins(compact)}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS_COLOR, fontSize: tickSize }}
          tickLine={false}
          axisLine={{ stroke: GRID_COLOR }}
          interval={xAxisInterval(data.length, compact)}
        />
        <YAxis
          width={yAxisWidth(compact)}
          tick={{ fill: AXIS_COLOR, fontSize: tickSize }}
          tickLine={false}
          axisLine={false}
          domain={[0, "auto"]}
          allowDecimals={trackingType !== "TIME"}
        />
        <Tooltip
          content={<ProgressTooltip trackingType={trackingType} />}
        />
        {trackingType === "WEIGHTED" && targetWeightKg != null ? (
          <ReferenceLine
            y={targetWeightKg}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="6 4"
            label={{
              value: `Target ${targetWeightKg} kg`,
              fill: AXIS_COLOR,
              fontSize: tickSize,
            }}
          />
        ) : null}
        <Line
          type="monotone"
          dataKey="chartValue"
          stroke={LINE_COLOR}
          strokeWidth={2.5}
          dot={{
            r: compact ? 3 : 4,
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

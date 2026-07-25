"use client";

import { cn } from "@/lib/utils";

type DashboardStatSparklineProps = {
  data: number[];
  className?: string;
};

const WIDTH = 80;
const HEIGHT = 32;

/** Lightweight SVG sparkline — avoids Recharts ResponsiveContainer sizing issues in KPI cards. */
export function DashboardStatSparkline({
  data,
  className,
}: DashboardStatSparklineProps) {
  const series = data.length > 0 ? data : [0, 0, 0, 0, 0, 0];
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = max - min || 1;

  const points = series
    .map((value, index) => {
      const x =
        series.length === 1 ? WIDTH / 2 : (index / (series.length - 1)) * WIDTH;
      const y = HEIGHT - 4 - ((value - min) / range) * (HEIGHT - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPoints = `0,${HEIGHT} ${points} ${WIDTH},${HEIGHT}`;

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("block max-h-full max-w-full", className)}
      aria-hidden
    >
      <polygon points={areaPoints} fill="currentColor" fillOpacity={0.15} />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

"use client";

import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

import { useChartLayout } from "@/hooks/use-chart-layout";
import { cn } from "@/lib/utils";

type ResponsiveChartShellProps = {
  children: ReactElement;
  className?: string;
};

/**
 * Constrains Recharts to a measured box so ResponsiveContainer does not collapse
 * or mis-size in flex/grid layouts (common on mobile landscape).
 */
export function ResponsiveChartShell({
  children,
  className,
}: ResponsiveChartShellProps) {
  const { compact, shortViewport } = useChartLayout();

  const heightClass = shortViewport
    ? "h-[min(180px,40vh)]"
    : compact
      ? "h-[220px]"
      : "h-[280px]";

  return (
    <div
      className={cn(
        "chart-shell w-full min-w-0 max-w-full overflow-hidden",
        heightClass,
        className,
      )}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        debounce={100}
        initialDimension={{ width: 360, height: 220 }}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
}

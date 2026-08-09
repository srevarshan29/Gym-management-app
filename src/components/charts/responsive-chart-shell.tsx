"use client";

import * as React from "react";
import { cloneElement, isValidElement, type ReactElement } from "react";

import { useChartLayout } from "@/hooks/use-chart-layout";
import { cn } from "@/lib/utils";

type ResponsiveChartShellProps = {
  children: ReactElement<{ width?: number; height?: number }>;
  className?: string;
};

/**
 * Measures its container and passes explicit width/height to Recharts charts.
 * Avoids ResponsiveContainer's zero-size inner div trick, which often fails on mobile.
 */
export function ResponsiveChartShell({
  children,
  className,
}: ResponsiveChartShellProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { compact, shortViewport } = useChartLayout();
  const [width, setWidth] = React.useState(0);

  const height = shortViewport ? 180 : compact ? 220 : 280;

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const next = Math.round(el.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener("orientationchange", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("chart-shell w-full min-w-0 max-w-full", className)}
      style={{ height }}
    >
      {width > 0 && isValidElement(children)
        ? cloneElement(children, { width, height })
        : null}
    </div>
  );
}

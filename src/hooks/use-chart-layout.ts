"use client";

import * as React from "react";

export type ChartLayout = {
  /** Viewport width under 640px */
  compact: boolean;
  /** orientation: landscape */
  landscape: boolean;
  /** Short viewport (landscape phone or max-height 500px) */
  shortViewport: boolean;
};

function readChartLayout(): ChartLayout {
  if (typeof window === "undefined") {
    return { compact: false, landscape: false, shortViewport: false };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const landscape = w > h;
  const compact = w < 640;
  const shortViewport = h < 500 || (landscape && h < 520);
  return { compact, landscape, shortViewport };
}

/** Responsive chart sizing — updates on resize and orientation change. */
export function useChartLayout(): ChartLayout {
  const [layout, setLayout] = React.useState<ChartLayout>(readChartLayout);

  React.useEffect(() => {
    const update = () => setLayout(readChartLayout());
    update();

    const mqls = [
      window.matchMedia("(max-width: 639px)"),
      window.matchMedia("(orientation: landscape)"),
      window.matchMedia("(max-height: 500px)"),
    ];
    for (const mql of mqls) {
      mql.addEventListener("change", update);
    }
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);

    return () => {
      for (const mql of mqls) {
        mql.removeEventListener("change", update);
      }
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  return layout;
}

export function chartMargins(compact: boolean) {
  return {
    top: 8,
    right: compact ? 4 : 12,
    left: compact ? 2 : 4,
    bottom: compact ? 4 : 8,
  };
}

export function yAxisWidth(compact: boolean) {
  return compact ? 42 : 56;
}

/** X-axis tick density for monthly charts (6 or 12 points). */
export function xAxisInterval(
  dataLength: number,
  compact: boolean,
): number | "preserveStartEnd" {
  if (dataLength <= 6) return compact ? 1 : 0;
  return compact ? "preserveStartEnd" : 1;
}

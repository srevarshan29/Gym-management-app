import React, { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ChartAreaSkeleton } from "@/components/charts/chart-area-skeleton";
import {
  ExerciseProgressChartLazy,
  MemberJoinsChartLazy,
  PackageDistributionChartLazy,
  RevenueTrendChartLazy,
} from "@/components/charts/lazy-charts";

describe("lazy chart modules", () => {
  it("exports dynamic chart entry points", () => {
    expect(typeof RevenueTrendChartLazy).toBe("function");
    expect(typeof PackageDistributionChartLazy).toBe("function");
    expect(typeof MemberJoinsChartLazy).toBe("function");
    expect(typeof ExerciseProgressChartLazy).toBe("function");
  });

  it("renders chart area skeleton fallback markup", () => {
    const html = renderToStaticMarkup(createElement(ChartAreaSkeleton));
    expect(html).toContain("animate-pulse");
  });

  it("renders taller skeleton for exercise progress loading state", () => {
    const html = renderToStaticMarkup(
      createElement(ChartAreaSkeleton, { heightClassName: "h-[240px]" }),
    );
    expect(html).toContain("h-[240px]");
  });
});

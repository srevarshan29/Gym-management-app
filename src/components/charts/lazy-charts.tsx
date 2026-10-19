"use client";

import dynamic from "next/dynamic";

import { ChartAreaSkeleton } from "@/components/charts/chart-area-skeleton";
const chartLoading = () => <ChartAreaSkeleton />;

export const RevenueTrendChartLazy = dynamic(
  () =>
    import("@/components/revenue-trend-chart").then((mod) => ({
      default: mod.RevenueTrendChart,
    })),
  { loading: chartLoading, ssr: false },
);

export const PackageDistributionChartLazy = dynamic(
  () =>
    import("@/components/package-distribution-chart").then((mod) => ({
      default: mod.PackageDistributionChart,
    })),
  { loading: chartLoading, ssr: false },
);

export const MemberJoinsChartLazy = dynamic(
  () =>
    import("@/components/member-joins-chart").then((mod) => ({
      default: mod.MemberJoinsChart,
    })),
  { loading: chartLoading, ssr: false },
);

export const ExerciseProgressChartLazy = dynamic(
  () =>
    import("@/components/workout/exercise-progress-chart").then((mod) => ({
      default: mod.ExerciseProgressChart,
    })),
  { loading: () => <ChartAreaSkeleton heightClassName="h-[240px]" />, ssr: false },
);

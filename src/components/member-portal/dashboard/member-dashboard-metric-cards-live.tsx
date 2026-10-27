"use client";

import { useCallback, type ComponentProps } from "react";

import { MemberDashboardMetricCards } from "@/components/member-portal/dashboard/member-dashboard-metric-cards";
import {
  useMemberDashboardWaterLive,
  type LiveWaterProgress,
} from "@/components/member-portal/dashboard/member-dashboard-water-live";

type Props = Omit<
  ComponentProps<typeof MemberDashboardMetricCards>,
  "onWaterProgress"
>;

export function MemberDashboardMetricCardsLive(props: Props) {
  const { dashboard, setLiveWater, applyDailyWaterTargetMl } =
    useMemberDashboardWaterLive();
  const onWaterProgress = useCallback(
    (progress: LiveWaterProgress) => {
      setLiveWater((prev) =>
        prev.consumedMl === progress.consumedMl &&
        prev.percent === progress.percent &&
        prev.goalComplete === progress.goalComplete
          ? prev
          : progress,
      );
    },
    [setLiveWater],
  );
  return (
    <MemberDashboardMetricCards
      {...props}
      waterTargetMl={dashboard.waterTargetMl}
      waterPercent={dashboard.waterPercent}
      waterGoalComplete={dashboard.waterGoalComplete}
      onWaterProgress={onWaterProgress}
      onWaterTargetSaved={applyDailyWaterTargetMl}
    />
  );
}

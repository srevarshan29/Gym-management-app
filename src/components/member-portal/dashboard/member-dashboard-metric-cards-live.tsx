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
  const { setLiveWater } = useMemberDashboardWaterLive();
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
      onWaterProgress={onWaterProgress}
    />
  );
}

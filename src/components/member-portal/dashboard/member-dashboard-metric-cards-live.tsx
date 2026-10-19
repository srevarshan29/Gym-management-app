"use client";

import { MemberDashboardMetricCards } from "@/components/member-portal/dashboard/member-dashboard-metric-cards";
import { useMemberDashboardWaterLive } from "@/components/member-portal/dashboard/member-dashboard-water-live";
import type { ComponentProps } from "react";

type Props = Omit<
  ComponentProps<typeof MemberDashboardMetricCards>,
  "onWaterProgress"
>;

export function MemberDashboardMetricCardsLive(props: Props) {
  const { setLiveWater } = useMemberDashboardWaterLive();
  return (
    <MemberDashboardMetricCards
      {...props}
      onWaterProgress={(progress) => setLiveWater(progress)}
    />
  );
}

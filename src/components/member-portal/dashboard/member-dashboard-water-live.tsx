"use client";

import * as React from "react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { resolveDashboardMessage } from "@/lib/member-portal/dashboard-message-engine";
import type { MemberPortalDashboardData } from "@/lib/member-portal/load-member-portal-dashboard";
import { isWorkoutCompletedTodaySuggestion } from "@/lib/workout-tracking/workout-completed-today";
import type { SuggestedWorkoutDay } from "@/lib/workout-tracking/types";

export type LiveWaterProgress = {
  consumedMl: number;
  percent: number;
  goalComplete: boolean;
};

type WaterLiveContextValue = {
  dashboard: MemberPortalDashboardData;
  liveWater: LiveWaterProgress;
  setLiveWater: React.Dispatch<React.SetStateAction<LiveWaterProgress>>;
};

const WaterLiveContext = createContext<WaterLiveContextValue | null>(null);

export function MemberDashboardWaterLiveProvider({
  dashboard,
  children,
}: {
  dashboard: MemberPortalDashboardData;
  children: ReactNode;
}) {
  const [liveWater, setLiveWater] = useState<LiveWaterProgress>({
    consumedMl: dashboard.waterConsumedMl,
    percent: dashboard.waterPercent,
    goalComplete: dashboard.waterGoalComplete,
  });

  const value = useMemo(
    () => ({ dashboard, liveWater, setLiveWater }),
    [dashboard, liveWater],
  );

  return (
    <WaterLiveContext.Provider value={value}>{children}</WaterLiveContext.Provider>
  );
}

export function useMemberDashboardWaterLive(): WaterLiveContextValue {
  const ctx = useContext(WaterLiveContext);
  if (!ctx) {
    throw new Error("useMemberDashboardWaterLive used outside provider");
  }
  return ctx;
}

export function computeLiveDashboardMessageText(
  dashboard: MemberPortalDashboardData,
  liveWater: LiveWaterProgress,
  memberId: string,
  greetingName: string,
  suggestion: SuggestedWorkoutDay,
): string {
  const waterRemainingMl = Math.max(
    0,
    dashboard.waterTargetMl - liveWater.consumedMl,
  );
  const caloriePercent =
    dashboard.calorieTarget != null ? dashboard.caloriePercent : null;

  return resolveDashboardMessage({
    dateKey: dashboard.dateKey,
    memberId,
    memberName: greetingName,
    suggestion,
    workoutCompletedToday: isWorkoutCompletedTodaySuggestion(suggestion),
    caloriePercent,
    calorieGoalComplete: dashboard.calorieGoalComplete,
    waterPercent: liveWater.percent,
    waterGoalComplete: liveWater.goalComplete,
    waterRemainingMl,
    recentMessageKeys: dashboard.message.patchRecentMessageKeys,
    greetingDateKey: dashboard.message.patchGreetingDateKey,
    greetingMessageKey: dashboard.message.patchGreetingMessageKey,
    celebratedCalorieDateKey: dashboard.message.patchCelebratedCalorieDateKey,
    celebratedWaterDateKey: liveWater.goalComplete
      ? dashboard.dateKey
      : dashboard.message.patchCelebratedWaterDateKey,
  }).text;
}

export function useMemberDashboardLiveMessageText(
  memberId: string,
  greetingName: string,
  suggestion: SuggestedWorkoutDay,
): string {
  const { dashboard, liveWater } = useMemberDashboardWaterLive();
  return computeLiveDashboardMessageText(
    dashboard,
    liveWater,
    memberId,
    greetingName,
    suggestion,
  );
}

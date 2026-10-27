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
import { waterDayProgress } from "@/lib/water/water-progress";

export type LiveWaterProgress = {
  consumedMl: number;
  percent: number;
  goalComplete: boolean;
};

type WaterLiveContextValue = {
  dashboard: MemberPortalDashboardData;
  setDashboard: React.Dispatch<React.SetStateAction<MemberPortalDashboardData>>;
  liveWater: LiveWaterProgress;
  setLiveWater: React.Dispatch<React.SetStateAction<LiveWaterProgress>>;
  applyDailyWaterTargetMl: (targetMl: number) => void;
  applyWeeklyAttendanceTarget: (targetDays: number) => void;
};

const WaterLiveContext = createContext<WaterLiveContextValue | null>(null);

export function MemberDashboardWaterLiveProvider({
  dashboard: initialDashboard,
  children,
}: {
  dashboard: MemberPortalDashboardData;
  children: ReactNode;
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [liveWater, setLiveWater] = useState<LiveWaterProgress>({
    consumedMl: initialDashboard.waterConsumedMl,
    percent: initialDashboard.waterPercent,
    goalComplete: initialDashboard.waterGoalComplete,
  });

  React.useEffect(() => {
    setDashboard(initialDashboard);
    setLiveWater({
      consumedMl: initialDashboard.waterConsumedMl,
      percent: initialDashboard.waterPercent,
      goalComplete: initialDashboard.waterGoalComplete,
    });
  }, [initialDashboard.dateKey]);

  const applyDailyWaterTargetMl = React.useCallback(
    (targetMl: number) => {
      const progress = waterDayProgress(liveWater.consumedMl, targetMl);
      setDashboard((prev) => ({
        ...prev,
        waterTargetMl: progress.targetMl,
        waterPercent: Math.round(progress.percent),
        waterGoalComplete: progress.goalComplete,
      }));
      setLiveWater((prev) => ({
        consumedMl: prev.consumedMl,
        percent: Math.round(progress.percent),
        goalComplete: progress.goalComplete,
      }));
    },
    [liveWater.consumedMl],
  );

  const applyWeeklyAttendanceTarget = React.useCallback((targetDays: number) => {
    setDashboard((prev) => ({
      ...prev,
      weeklyAttendanceTarget: targetDays,
    }));
  }, []);

  const value = useMemo(
    () => ({
      dashboard,
      setDashboard,
      liveWater,
      setLiveWater,
      applyDailyWaterTargetMl,
      applyWeeklyAttendanceTarget,
    }),
    [
      dashboard,
      liveWater,
      applyDailyWaterTargetMl,
      applyWeeklyAttendanceTarget,
    ],
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

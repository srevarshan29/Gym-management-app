"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { startWorkoutSession } from "@/app/actions/workout-sessions";
import { MemberExerciseLibraryPanel } from "@/components/member-portal/workout/member-exercise-library-panel";
import { MemberWorkoutPlanPanel } from "@/components/member-portal/workout/member-workout-plan-panel";
import {
  MemberWorkoutTabs,
  type MemberWorkoutTab,
} from "@/components/member-portal/workout/member-workout-tabs";
import { MemberActiveWorkoutSession } from "@/components/member-portal/workout/member-active-workout-session";
import { parseMemberLibraryMuscleGroup } from "@/lib/member-portal/member-library-muscle-groups";
import {
  memberPersonalWorkoutEditorHref,
  parseMemberPlanFilter,
  parseMemberWorkoutTab,
  readMemberWorkoutPageQueryFromLocation,
  syncMemberWorkoutPageUrl,
  type MemberPlanFilter,
} from "@/lib/member-portal/member-workout-tab-url";
import { MemberWorkoutTheme } from "@/components/member-portal/workout/member-workout-theme";
import type {
  ActiveWorkoutSession,
  WorkoutPlanDetail,
} from "@/lib/workout-tracking/types";
import { cn } from "@/lib/utils";

type MemberWorkoutPageClientProps = {
  plan: WorkoutPlanDetail | null;
  activeSession: ActiveWorkoutSession | null;
  canStart: boolean;
  initialTab?: string | null;
  addToWorkoutId?: string | null;
  createdWorkoutId?: string | null;
};

export function MemberWorkoutPageClient({
  plan,
  activeSession,
  canStart,
  initialTab = null,
  addToWorkoutId = null,
  createdWorkoutId = null,
}: MemberWorkoutPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedAddTo =
    searchParams.get("addTo")?.trim() || addToWorkoutId?.trim() || null;
  const rawTabParam = searchParams.get("tab") ?? initialTab;
  const urlTopTab = resolvedAddTo
    ? "exercises"
    : parseMemberWorkoutTab(rawTabParam);
  const urlPlanFilter = parseMemberPlanFilter(
    rawTabParam,
    searchParams.get("planFilter"),
  );

  const [tab, setTab] = React.useState<MemberWorkoutTab>(urlTopTab);
  const [planFilter, setPlanFilter] =
    React.useState<MemberPlanFilter>(urlPlanFilter);
  const [, startTransition] = React.useTransition();
  const [startingDayKey, setStartingDayKey] = React.useState<string | null>(
    null,
  );

  const resolvedCreated =
    searchParams.get("created")?.trim() || createdWorkoutId?.trim() || null;
  const resolvedGroup = parseMemberLibraryMuscleGroup(
    searchParams.get("group"),
  );

  const syncTabStateFromLocation = React.useCallback(() => {
    const fromLocation = readMemberWorkoutPageQueryFromLocation();
    setTab(fromLocation.topTab);
    setPlanFilter(fromLocation.planFilter);
  }, []);

  React.useEffect(() => {
    setTab(urlTopTab);
    setPlanFilter(urlPlanFilter);
  }, [urlTopTab, urlPlanFilter]);

  React.useEffect(() => {
    syncTabStateFromLocation();
  }, [syncTabStateFromLocation]);

  React.useEffect(() => {
    const onPopState = () => syncTabStateFromLocation();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [syncTabStateFromLocation]);

  React.useEffect(() => {
    const addTo = resolvedAddTo;
    if (!addTo) return;
    const tabParam = searchParams.get("tab") ?? initialTab;
    if (parseMemberWorkoutTab(tabParam) === "exercises") return;
    syncMemberWorkoutPageUrl({
      tab: "library",
      addTo,
      group: parseMemberLibraryMuscleGroup(searchParams.get("group")),
    });
  }, [resolvedAddTo, searchParams, initialTab]);

  React.useEffect(() => {
    if (activeSession) {
      setStartingDayKey(null);
    }
  }, [activeSession]);

  function navigateTopTab(next: MemberWorkoutTab) {
    setTab(next);
    syncMemberWorkoutPageUrl({
      tab: next === "exercises" ? "library" : "plan",
      planFilter: next === "plan" ? planFilter : null,
      addTo: next === "exercises" ? resolvedAddTo : null,
      created: next === "plan" ? resolvedCreated : null,
      group: next === "exercises" ? resolvedGroup : null,
    });
  }

  function navigatePlanFilter(next: MemberPlanFilter) {
    setPlanFilter(next);
    syncMemberWorkoutPageUrl({
      tab: "plan",
      planFilter: next,
      created: next === "mine" ? resolvedCreated : null,
    });
  }

  async function onStartTrainer(dayId?: string) {
    const dayKey = dayId ?? "__default__";
    if (startingDayKey !== null) return;
    setStartingDayKey(dayKey);
    try {
      const result = await startWorkoutSession(dayId);
      if (!result.ok) {
        toast.error(result.error);
        setStartingDayKey(null);
        return;
      }
      toast.success(result.message ?? "Workout started.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("[workout] startWorkoutSession failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start workout. Please try again.",
      );
      setStartingDayKey(null);
    }
  }

  if (activeSession) {
    return (
      <MemberActiveWorkoutSession session={activeSession} />
    );
  }

  return (
    <MemberWorkoutTheme className="!p-0 sm:!p-0">
      <MemberWorkoutTabs value={tab} onChange={(next) => navigateTopTab(next)} />

      <div
        className={cn(tab !== "exercises" && "hidden")}
        hidden={tab !== "exercises"}
        aria-hidden={tab !== "exercises"}
      >
        <MemberExerciseLibraryPanel
          addToWorkoutId={resolvedAddTo}
          initialGroup={resolvedGroup}
          selectionMode={Boolean(resolvedAddTo)}
          doneHref={
            resolvedAddTo
              ? memberPersonalWorkoutEditorHref(resolvedAddTo)
              : null
          }
        />
      </div>

      <div
        className={cn(tab !== "plan" && "hidden")}
        hidden={tab !== "plan"}
        aria-hidden={tab !== "plan"}
      >
        <MemberWorkoutPlanPanel
          planFilter={planFilter}
          onPlanFilterChange={navigatePlanFilter}
          plan={plan}
          canStart={canStart}
          startingDayKey={startingDayKey}
          onStartTrainer={(dayId) => void onStartTrainer(dayId)}
          highlightWorkoutId={resolvedCreated}
          onHighlightConsumed={() => {
            setPlanFilter("mine");
            syncMemberWorkoutPageUrl({ tab: "mine" });
          }}
          onOpenExercisesTab={() => navigateTopTab("exercises")}
        />
      </div>
    </MemberWorkoutTheme>
  );
}
